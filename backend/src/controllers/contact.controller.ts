import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';

// Submit contact form
export const submitContactForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      throw new AppError('Name, email, subject, and message are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Insert contact message
    const result = await query(
      `INSERT INTO contact_messages (name, email, phone, subject, message, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, subject, message, status, created_at`,
      [name, email, phone || null, subject, message, 'new']
    );

    res.status(201).json({
      success: true,
      message: 'Contact message submitted successfully',
      data: {
        message: result.rows[0],
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// Get all contact messages (Admin only)
export const getAllContactMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryText = `
      SELECT 
        id, name, email, phone, subject, message, status, 
        read_at, read_by, created_at, updated_at
      FROM contact_messages
    `;
    const queryParams: any[] = [];
    
    if (status) {
      queryText += ` WHERE status = $1`;
      queryParams.push(status);
      queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);
    } else {
      queryText += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      queryParams.push(limit, offset);
    }

    const messages = await query(queryText, queryParams);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM contact_messages`;
    const countParams: any[] = [];
    if (status) {
      countQuery += ` WHERE status = $1`;
      countParams.push(status);
    }
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        messages: messages.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// Get single contact message (Admin only)
export const getContactMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.userType !== 'admin') {
      throw new AppError('Unauthorized. Admin access required', 403);
    }

    const { id } = req.params;

    const result = await query(
      `SELECT 
        id, name, email, phone, subject, message, status, 
        read_at, read_by, created_at, updated_at
       FROM contact_messages
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Contact message not found', 404);
    }

    res.json({
      success: true,
      data: {
        message: result.rows[0],
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// Mark message as read (Admin only)
export const markMessageAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.userType !== 'admin') {
      throw new AppError('Unauthorized. Admin access required', 403);
    }

    const { id } = req.params;

    // Update message status
    const result = await query(
      `UPDATE contact_messages 
       SET status = 'read', read_at = CURRENT_TIMESTAMP, read_by = $1
       WHERE id = $2
       RETURNING id, name, email, phone, subject, message, status, read_at, read_by, created_at, updated_at`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Contact message not found', 404);
    }

    res.json({
      success: true,
      message: 'Message marked as read',
      data: {
        message: result.rows[0],
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// Update message status (Admin only)
export const updateMessageStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.userType !== 'admin') {
      throw new AppError('Unauthorized. Admin access required', 403);
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'read', 'replied', 'archived'].includes(status)) {
      throw new AppError('Invalid status. Must be one of: new, read, replied, archived', 400);
    }

    // Update message status
    const updateFields: string[] = ['status = $1'];
    const updateValues: any[] = [status];

    if (status === 'read' && !req.body.read_at) {
      updateFields.push('read_at = CURRENT_TIMESTAMP');
      updateFields.push('read_by = $2');
      updateValues.push(req.user.id);
    }

    const result = await query(
      `UPDATE contact_messages 
       SET ${updateFields.join(', ')}
       WHERE id = $${updateValues.length + 1}
       RETURNING id, name, email, phone, subject, message, status, read_at, read_by, created_at, updated_at`,
      [...updateValues, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Contact message not found', 404);
    }

    res.json({
      success: true,
      message: 'Message status updated',
      data: {
        message: result.rows[0],
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// Delete contact message (Admin only)
export const deleteContactMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.userType !== 'admin') {
      throw new AppError('Unauthorized. Admin access required', 403);
    }

    const { id } = req.params;

    const result = await query(
      `DELETE FROM contact_messages WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Contact message not found', 404);
    }

    res.json({
      success: true,
      message: 'Contact message deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
};

