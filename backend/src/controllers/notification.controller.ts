import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Get Notifications (for any user)
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [req.user.id];
    let paramCount = 1;

    if (unreadOnly === 'true') {
      whereClause += ' AND read_at IS NULL';
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        notifications: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Notification by ID
export const getNotificationById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [id, req.user.id]);

    if (result.rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    res.json({
      success: true,
      data: {
        notification: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark Notification as Read
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *', [
      id,
      req.user.id,
    ]);

    if (result.rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// Mark All Notifications as Read
export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    await query('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read_at IS NULL', [
      req.user.id,
    ]);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// Delete Notification
export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *', [
      id,
      req.user.id,
    ]);

    if (result.rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Create Notification (Admin/Owner only)
export const createNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin' && req.user.userType !== 'owner') {
      throw new AppError('Only admins and owners can create notifications', 403);
    }

    const { userId, title, message, type, metadata } = req.body;

    if (!userId || !title || !message) {
      throw new AppError('User ID, title, and message are required', 400);
    }

    const notificationId = uuidv4();
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, channels, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        notificationId,
        userId,
        title,
        message,
        type || 'info',
        ['web', 'email'], // Default channels
        'pending',
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: {
        notificationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Unread Count
export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        unreadCount: parseInt(result.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
};

