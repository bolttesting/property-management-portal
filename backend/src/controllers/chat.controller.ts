import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Create or Get Chat Room
export const getOrCreateChatRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { recipientId, recipientType, roomType } = req.body;

    if (!recipientId || !recipientType || !roomType) {
      throw new AppError('Recipient ID, type, and room type are required', 400);
    }

    // Check if room already exists
    let roomResult = await query(
      `SELECT * FROM chat_rooms 
       WHERE ((participant1_id = $1 AND participant2_id = $2) 
          OR (participant1_id = $2 AND participant2_id = $1))
       AND room_type = $3`,
      [req.user.id, recipientId, roomType]
    );

    let roomId: string;

    if (roomResult.rows.length > 0) {
      roomId = roomResult.rows[0].id;
    } else {
      // Create new room
      roomId = uuidv4();
      await query(
        `INSERT INTO chat_rooms (
          id, room_type, participant1_id, participant1_type,
          participant2_id, participant2_type
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [roomId, roomType, req.user.id, req.user.userType, recipientId, recipientType]
      );
    }

    res.json({
      success: true,
      data: {
        roomId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Chat Rooms for User
export const getChatRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Enhanced query to show tenant/owner names and property information
    const result = await query(
      `SELECT cr.*,
       CASE 
         WHEN cr.participant1_id = $1 THEN cr.participant2_id
         ELSE cr.participant1_id
       END as other_participant_id,
       CASE 
         WHEN cr.participant1_id = $1 THEN 
           (SELECT u.email FROM users u WHERE u.id = cr.participant2_id)
         ELSE 
           (SELECT u.email FROM users u WHERE u.id = cr.participant1_id)
       END as other_participant_email,
       CASE 
         WHEN cr.participant1_id = $1 THEN cr.participant2_type
         ELSE cr.participant1_type
       END as other_participant_type,
       CASE 
         WHEN cr.participant1_id = $1 AND cr.participant2_type = 'tenant' THEN 
           (SELECT t.full_name FROM tenants t JOIN users u ON t.user_id = u.id WHERE u.id = cr.participant2_id)
         WHEN cr.participant1_id = $1 AND cr.participant2_type = 'owner' THEN 
           (SELECT COALESCE(o.company_name, CONCAT(o.first_name, ' ', o.last_name)) FROM owners o JOIN users u ON o.user_id = u.id WHERE u.id = cr.participant2_id)
         WHEN cr.participant2_id = $1 AND cr.participant1_type = 'tenant' THEN 
           (SELECT t.full_name FROM tenants t JOIN users u ON t.user_id = u.id WHERE u.id = cr.participant1_id)
         WHEN cr.participant2_id = $1 AND cr.participant1_type = 'owner' THEN 
           (SELECT COALESCE(o.company_name, CONCAT(o.first_name, ' ', o.last_name)) FROM owners o JOIN users u ON o.user_id = u.id WHERE u.id = cr.participant1_id)
         ELSE NULL
       END as other_participant_name,
       CASE 
         WHEN cr.participant1_id = $1 AND cr.participant2_type = 'tenant' THEN 
           (SELECT u.mobile FROM users u WHERE u.id = cr.participant2_id)
         WHEN cr.participant2_id = $1 AND cr.participant1_type = 'tenant' THEN 
           (SELECT u.mobile FROM users u WHERE u.id = cr.participant1_id)
         ELSE NULL
       END as other_participant_mobile
       FROM chat_rooms cr
       WHERE cr.participant1_id = $1 OR cr.participant2_id = $1
       ORDER BY cr.last_message_at DESC NULLS LAST, cr.created_at DESC`,
      [req.user.id]
    );

    // For owners, get property information for each tenant chat
    if (req.user.userType === 'owner') {
      // Get owner_id first
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length > 0) {
        const ownerId = ownerResult.rows[0].id;
        
        for (const room of result.rows) {
          if (room.other_participant_type === 'tenant' && room.other_participant_id) {
            // Get tenant_id from user_id
            const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [room.other_participant_id]);
            if (tenantResult.rows.length > 0) {
              const tenantId = tenantResult.rows[0].id;
              
              // Get properties connected through applications or leases
              // First try to get from leases (more recent), then applications
              let propertyResult = await query(
                `SELECT p.id, p.property_name, p.address, l.created_at as connection_date
                 FROM properties p
                 INNER JOIN leases l ON l.property_id = p.id AND l.tenant_id = $1
                 WHERE p.owner_id = $2
                 ORDER BY l.created_at DESC
                 LIMIT 1`,
                [tenantId, ownerId]
              );
              
              // If no lease, get from applications
              if (propertyResult.rows.length === 0) {
                propertyResult = await query(
                  `SELECT p.id, p.property_name, p.address, a.created_at as connection_date
                   FROM properties p
                   INNER JOIN applications a ON a.property_id = p.id AND a.tenant_id = $1
                   WHERE p.owner_id = $2
                   ORDER BY a.created_at DESC
                   LIMIT 1`,
                  [tenantId, ownerId]
                );
              }
              
              if (propertyResult.rows.length > 0) {
                const property = propertyResult.rows[0];
                room.connected_property = property.property_name;
                if (property.address && typeof property.address === 'string') {
                  try {
                    room.connected_property_address = JSON.parse(property.address);
                  } catch {
                    room.connected_property_address = property.address;
                  }
                } else {
                  room.connected_property_address = property.address;
                }
              }
            }
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        rooms: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Chat Messages
export const getChatMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Verify user is participant in this room
    const roomResult = await query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
      [roomId, req.user.id]
    );

    if (roomResult.rows.length === 0) {
      throw new AppError('Chat room not found or unauthorized', 404);
    }

    const result = await query(
      `SELECT m.*, 
       u1.email as sender_email,
       CASE 
         WHEN au1.role IS NOT NULL THEN CONCAT('Admin: ', au1.role)
         WHEN t1.full_name IS NOT NULL THEN t1.full_name
         WHEN o1.company_name IS NOT NULL THEN o1.company_name
         ELSE u1.email
       END as sender_name
       FROM chat_messages m
       JOIN users u1 ON m.sender_id = u1.id
       LEFT JOIN admin_users au1 ON u1.id = au1.user_id AND m.sender_type = 'admin'
       LEFT JOIN tenants t1 ON u1.id = t1.user_id AND m.sender_type = 'tenant'
       LEFT JOIN owners o1 ON u1.id = o1.user_id AND m.sender_type = 'owner'
       WHERE m.chat_room_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [roomId, Number(limit), offset]
    );

    // Mark messages as read
    await query(
      `UPDATE chat_messages 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE chat_room_id = $1 
       AND recipient_id = $2 
       AND is_read = FALSE`,
      [roomId, req.user.id]
    );

    // Update unread count in chat room
    const room = roomResult.rows[0];
    if (room.participant1_id === req.user.id) {
      await query('UPDATE chat_rooms SET unread_count_participant1 = 0 WHERE id = $1', [roomId]);
    } else {
      await query('UPDATE chat_rooms SET unread_count_participant2 = 0 WHERE id = $1', [roomId]);
    }

    res.json({
      success: true,
      data: {
        messages: result.rows.reverse(), // Reverse to show oldest first
      },
    });
  } catch (error) {
    next(error);
  }
};

// Send Chat Message
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { roomId, message, messageType, attachmentUrl } = req.body;

    if (!roomId || !message) {
      throw new AppError('Room ID and message are required', 400);
    }

    // Verify user is participant in this room
    const roomResult = await query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
      [roomId, req.user.id]
    );

    if (roomResult.rows.length === 0) {
      throw new AppError('Chat room not found or unauthorized', 404);
    }

    const room = roomResult.rows[0];

    // Determine recipient
    const recipientId = room.participant1_id === req.user.id ? room.participant2_id : room.participant1_id;
    const recipientType = room.participant1_id === req.user.id ? room.participant2_type : room.participant1_type;

    const messageId = uuidv4();
    await query(
      `INSERT INTO chat_messages (
        id, chat_room_id, sender_id, sender_type,
        recipient_id, recipient_type, message, message_type, attachment_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        messageId,
        roomId,
        req.user.id,
        req.user.userType,
        recipientId,
        recipientType,
        message,
        messageType || 'text',
        attachmentUrl || null,
      ]
    );

    // Update chat room last message info
    const preview = message.length > 100 ? message.substring(0, 100) + '...' : message;

    // Update unread count for recipient
    if (room.participant1_id === req.user.id) {
      await query(
        `UPDATE chat_rooms 
         SET last_message_at = CURRENT_TIMESTAMP, 
             last_message_preview = $1,
             unread_count_participant2 = unread_count_participant2 + 1
         WHERE id = $2`,
        [preview, roomId]
      );
    } else {
      await query(
        `UPDATE chat_rooms 
         SET last_message_at = CURRENT_TIMESTAMP, 
             last_message_preview = $1,
             unread_count_participant1 = unread_count_participant1 + 1
         WHERE id = $2`,
        [preview, roomId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark Messages as Read
export const markMessagesAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { roomId } = req.params;

    // Verify user is participant
    const roomResult = await query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
      [roomId, req.user.id]
    );

    if (roomResult.rows.length === 0) {
      throw new AppError('Chat room not found or unauthorized', 404);
    }

    const room = roomResult.rows[0];

    // Mark messages as read
    await query(
      `UPDATE chat_messages 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE chat_room_id = $1 
       AND recipient_id = $2 
       AND is_read = FALSE`,
      [roomId, req.user.id]
    );

    // Update unread count
    if (room.participant1_id === req.user.id) {
      await query('UPDATE chat_rooms SET unread_count_participant1 = 0 WHERE id = $1', [roomId]);
    } else {
      await query('UPDATE chat_rooms SET unread_count_participant2 = 0 WHERE id = $1', [roomId]);
    }

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// Get Unread Message Count
export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_unread,
        COUNT(DISTINCT chat_room_id) as rooms_with_unread
       FROM chat_messages
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        totalUnread: parseInt(result.rows[0].total_unread),
        roomsWithUnread: parseInt(result.rows[0].rooms_with_unread),
      },
    });
  } catch (error) {
    next(error);
  }
};

