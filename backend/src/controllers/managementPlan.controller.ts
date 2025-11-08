import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Create Management Plan (Admin only)
export const createManagementPlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can create management plans', 403);
    }

    const { name, description, features, price, duration, isActive } = req.body;

    if (!name || !price || !duration) {
      throw new AppError('Name, price, and duration are required', 400);
    }

    if (!['monthly', 'quarterly', 'annual'].includes(duration)) {
      throw new AppError('Invalid duration. Must be monthly, quarterly, or annual', 400);
    }

    const planId = uuidv4();
    await query(
      `INSERT INTO management_plans (id, name, description, features, price, duration, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [planId, name, description || null, features || [], price, duration, isActive !== false]
    );

    res.status(201).json({
      success: true,
      message: 'Management plan created successfully',
      data: {
        planId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Management Plans
export const getManagementPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isActive, duration } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (isActive !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(isActive === 'true');
    }

    if (duration) {
      paramCount++;
      whereClause += ` AND duration = $${paramCount}`;
      params.push(duration);
    }

    const result = await query(
      `SELECT * FROM management_plans ${whereClause} ORDER BY price ASC, created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        plans: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Management Plan by ID
export const getManagementPlanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM management_plans WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Management plan not found', 404);
    }

    res.json({
      success: true,
      data: {
        plan: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Management Plan (Admin only)
export const updateManagementPlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can update management plans', 403);
    }

    const { id } = req.params;
    const { name, description, features, price, duration, isActive } = req.body;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (features !== undefined) {
      paramCount++;
      updates.push(`features = $${paramCount}`);
      params.push(features);
    }
    if (price !== undefined) {
      paramCount++;
      updates.push(`price = $${paramCount}`);
      params.push(price);
    }
    if (duration !== undefined) {
      if (!['monthly', 'quarterly', 'annual'].includes(duration)) {
        throw new AppError('Invalid duration', 400);
      }
      paramCount++;
      updates.push(`duration = $${paramCount}`);
      params.push(duration);
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
      `UPDATE management_plans SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Management plan updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete Management Plan (Admin only)
export const deleteManagementPlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin') {
      throw new AppError('Only admins can delete management plans', 403);
    }

    const { id } = req.params;

    // Check if plan is in use
    const usageResult = await query('SELECT COUNT(*) FROM owners WHERE management_plan_id = $1', [id]);
    if (parseInt(usageResult.rows[0].count) > 0) {
      throw new AppError('Cannot delete plan that is in use by owners', 400);
    }

    await query('DELETE FROM management_plans WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Management plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

