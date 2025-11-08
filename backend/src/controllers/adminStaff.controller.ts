import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Create Admin Staff User (Super Admin only)
export const createAdminStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Check if user is super admin
    const adminCheck = await query(
      `SELECT au.role FROM admin_users au
       JOIN users u ON au.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'super_admin') {
      throw new AppError('Only super admins can create admin staff', 403);
    }

    const { email, mobile, password, role, department, branchId, firstName, lastName } = req.body;

    if (!email && !mobile) {
      throw new AppError('Email or mobile number is required', 400);
    }
    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }
    if (!role || !['property_manager', 'leasing_agent', 'maintenance_coordinator', 'finance_manager'].includes(role)) {
      throw new AppError('Valid role is required', 400);
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR mobile = $2',
      [email || null, mobile || null]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists with this email or mobile', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, email, mobile, password_hash, user_type, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email || null, mobile || null, passwordHash, 'admin', 'active']
    );

    // Create admin user record
    await query(
      `INSERT INTO admin_users (user_id, role, department, branch_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, role, department || null, branchId || null]
    );

    res.status(201).json({
      success: true,
      message: 'Admin staff created successfully',
      data: {
        userId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Admin Staff (Super Admin only)
export const getAdminStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Check if user is super admin
    const adminCheck = await query(
      `SELECT au.role FROM admin_users au
       JOIN users u ON au.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'super_admin') {
      throw new AppError('Only super admins can view admin staff', 403);
    }

    const { role, department, branchId, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      whereClause += ` AND au.role = $${paramCount}`;
      params.push(role);
    }

    if (department) {
      paramCount++;
      whereClause += ` AND au.department = $${paramCount}`;
      params.push(department);
    }

    if (branchId) {
      paramCount++;
      whereClause += ` AND au.branch_id = $${paramCount}`;
      params.push(branchId);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT au.*, u.email, u.mobile, u.status as user_status, u.created_at,
       b.name as branch_name
       FROM admin_users au
       JOIN users u ON au.user_id = u.id
       LEFT JOIN branches b ON au.branch_id = b.id
       ${whereClause}
       ORDER BY au.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM admin_users au ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        staff: result.rows,
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

// Get Admin Staff by ID
export const getAdminStaffById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query(
      `SELECT au.*, u.email, u.mobile, u.status as user_status, u.created_at,
       b.name as branch_name
       FROM admin_users au
       JOIN users u ON au.user_id = u.id
       LEFT JOIN branches b ON au.branch_id = b.id
       WHERE au.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Admin staff not found', 404);
    }

    res.json({
      success: true,
      data: {
        staff: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Admin Staff (Super Admin only)
export const updateAdminStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Check if user is super admin
    const adminCheck = await query(
      `SELECT au.role FROM admin_users au
       JOIN users u ON au.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'super_admin') {
      throw new AppError('Only super admins can update admin staff', 403);
    }

    const { id } = req.params;
    const { role, department, branchId } = req.body;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (role !== undefined) {
      if (!['property_manager', 'leasing_agent', 'maintenance_coordinator', 'finance_manager'].includes(role)) {
        throw new AppError('Invalid role', 400);
      }
      paramCount++;
      updates.push(`role = $${paramCount}`);
      params.push(role);
    }
    if (department !== undefined) {
      paramCount++;
      updates.push(`department = $${paramCount}`);
      params.push(department);
    }
    if (branchId !== undefined) {
      paramCount++;
      updates.push(`branch_id = $${paramCount}`);
      params.push(branchId);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE admin_users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Admin staff updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete Admin Staff (Super Admin only)
export const deleteAdminStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Check if user is super admin
    const adminCheck = await query(
      `SELECT au.role FROM admin_users au
       JOIN users u ON au.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'super_admin') {
      throw new AppError('Only super admins can delete admin staff', 403);
    }

    const { id } = req.params;

    // Don't allow deleting super admin
    const staffCheck = await query('SELECT role FROM admin_users WHERE user_id = $1', [id]);
    if (staffCheck.rows.length > 0 && staffCheck.rows[0].role === 'super_admin') {
      throw new AppError('Cannot delete super admin', 400);
    }

    // Delete admin_users record (cascade will delete user)
    await query('DELETE FROM admin_users WHERE user_id = $1', [id]);

    res.json({
      success: true,
      message: 'Admin staff deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

