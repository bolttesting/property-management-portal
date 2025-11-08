import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Create Branch (Admin only)
export const createBranch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can create branches', 403);
    }

    const { name, emirate, address, contactPhone, contactEmail, isActive } = req.body;

    if (!name || !emirate || !address) {
      throw new AppError('Name, emirate, and address are required', 400);
    }

    const branchId = uuidv4();
    const contactInfo = {
      phone: contactPhone || null,
      email: contactEmail || null,
    };
    await query(
      `INSERT INTO branches (id, name, emirate, address, contact_info, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        branchId,
        name,
        emirate,
        JSON.stringify(address),
        JSON.stringify(contactInfo),
        isActive !== false,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: {
        branchId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Branches
export const getBranches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { emirate, isActive } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (emirate) {
      paramCount++;
      whereClause += ` AND emirate = $${paramCount}`;
      params.push(emirate);
    }

    if (isActive !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(isActive === 'true');
    }

    const result = await query(
      `SELECT b.*
       FROM branches b
       ${whereClause}
       ORDER BY b.name ASC`,
      params
    );

    res.json({
      success: true,
      data: {
        branches: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Branch by ID
export const getBranchById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM branches WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Branch not found', 404);
    }

    res.json({
      success: true,
      data: {
        branch: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Branch (Admin only)
export const updateBranch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can update branches', 403);
    }

    const { id } = req.params;
    const { name, emirate, address, contactPhone, contactEmail, isActive } = req.body;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }
    if (emirate !== undefined) {
      paramCount++;
      updates.push(`emirate = $${paramCount}`);
      params.push(emirate);
    }
    if (address !== undefined) {
      paramCount++;
      updates.push(`address = $${paramCount}`);
      params.push(JSON.stringify(address));
    }
    if (contactPhone !== undefined || contactEmail !== undefined) {
      // Get existing contact_info and update
      const existingResult = await query('SELECT contact_info FROM branches WHERE id = $1', [id]);
      const existingContactInfo = existingResult.rows[0]?.contact_info || {};
      const contactInfo = {
        phone: contactPhone !== undefined ? contactPhone : existingContactInfo.phone,
        email: contactEmail !== undefined ? contactEmail : existingContactInfo.email,
      };
      paramCount++;
      updates.push(`contact_info = $${paramCount}`);
      params.push(JSON.stringify(contactInfo));
    }
    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      params.push(isActive);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE branches SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Branch updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete Branch (Admin only)
export const deleteBranch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can delete branches', 403);
    }

    const { id } = req.params;

    // Check if branch has staff (if branch_id column exists in admin_users)
    // Note: This check may not be needed if branch_id is not used
    // const staffResult = await query('SELECT COUNT(*) FROM admin_users WHERE branch_id = $1', [id]);
    // if (parseInt(staffResult.rows[0].count) > 0) {
    //   throw new AppError('Cannot delete branch that has staff assigned', 400);
    // }

    await query('DELETE FROM branches WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Branch deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

