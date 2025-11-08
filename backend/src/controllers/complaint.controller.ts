import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Create Complaint
export const createComplaint = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { relatedTo, relatedId, subject, description, priority } = req.body;

    if (!subject || !description) {
      throw new AppError('Subject and description are required', 400);
    }

    const complaintId = uuidv4();
    await query(
      `INSERT INTO complaints (
        id, user_id, user_type, related_to, related_id,
        subject, description, priority, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        complaintId,
        req.user.id,
        req.user.userType,
        relatedTo || null,
        relatedId || null,
        subject,
        description,
        priority || 'medium',
        'open',
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: {
        complaintId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Complaints
export const getComplaints = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    if (req.user.userType === 'admin') {
      // Admin can see all complaints
      whereClause = 'WHERE 1=1';
    } else {
      // Users can only see their own complaints
      whereClause = 'WHERE user_id = $1';
      params.push(req.user.id);
      paramCount = 1;
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      whereClause += ` AND priority = $${paramCount}`;
      params.push(priority);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT c.*, 
       u.email, u.mobile,
       CASE 
         WHEN c.user_type = 'tenant' THEN t.full_name
         WHEN c.user_type = 'owner' THEN CONCAT(o.first_name, ' ', o.last_name)
         ELSE NULL
       END as user_name
       FROM complaints c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN tenants t ON c.user_type = 'tenant' AND c.user_id = t.user_id
       LEFT JOIN owners o ON c.user_type = 'owner' AND c.user_id = o.user_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(`SELECT COUNT(*) FROM complaints c ${whereClause}`, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        complaints: result.rows,
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

// Get Complaint by ID
export const getComplaintById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query(
      `SELECT c.*, 
       u.email, u.mobile,
       CASE 
         WHEN c.user_type = 'tenant' THEN t.full_name
         WHEN c.user_type = 'owner' THEN CONCAT(o.first_name, ' ', o.last_name)
         ELSE NULL
       END as user_name
       FROM complaints c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN tenants t ON c.user_type = 'tenant' AND c.user_id = t.user_id
       LEFT JOIN owners o ON c.user_type = 'owner' AND c.user_id = o.user_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Complaint not found', 404);
    }

    const complaint = result.rows[0];

    // Check authorization
    if (req.user.userType !== 'admin' && complaint.user_id !== req.user.id) {
      throw new AppError('Unauthorized', 403);
    }

    res.json({
      success: true,
      data: {
        complaint,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Complaint Status (Admin/Owner)
export const updateComplaintStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can update complaint status', 403);
    }

    const { id } = req.params;
    const { status, assignedTo, resolutionNotes } = req.body;

    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Build update query
    const updates: string[] = ['status = $1'];
    const params: any[] = [status];
    let paramCount = 1;

    if (assignedTo !== undefined) {
      paramCount++;
      updates.push(`assigned_to = $${paramCount}`);
      params.push(assignedTo);
    }

    if (resolutionNotes !== undefined) {
      paramCount++;
      updates.push(`resolution_notes = $${paramCount}`);
      params.push(resolutionNotes);
    }

    if (status === 'resolved' || status === 'closed') {
      updates.push(`resolved_at = CURRENT_TIMESTAMP`);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE complaints SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

