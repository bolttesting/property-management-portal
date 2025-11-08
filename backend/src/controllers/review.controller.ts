import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Create Review (Tenant can review property after lease)
export const createReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'tenant') {
      throw new AppError('Only tenants can create reviews', 403);
    }

    const { propertyId, leaseId, rating, title, comment } = req.body;

    if (!propertyId || !rating) {
      throw new AppError('Property ID and rating are required', 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    // Verify tenant has a lease for this property (optional check)
    if (leaseId) {
      const leaseResult = await query(
        'SELECT * FROM leases WHERE id = $1 AND tenant_id = $2 AND property_id = $3',
        [leaseId, tenantId, propertyId]
      );
      if (leaseResult.rows.length === 0) {
        throw new AppError('Lease not found or unauthorized', 404);
      }
    }

    // Check if review already exists
    const existingReview = await query(
      'SELECT id FROM property_reviews WHERE property_id = $1 AND tenant_id = $2',
      [propertyId, tenantId]
    );

    if (existingReview.rows.length > 0) {
      throw new AppError('Review already exists for this property', 400);
    }

    const reviewId = uuidv4();
    await query(
      `INSERT INTO property_reviews (id, property_id, tenant_id, lease_id, rating, title, comment, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [reviewId, propertyId, tenantId, leaseId || null, rating, title || null, comment || null, !!leaseId]
    );

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        reviewId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Reviews for Property
export const getPropertyReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(
      `SELECT r.*, t.full_name as tenant_name
       FROM property_reviews r
       JOIN tenants t ON r.tenant_id = t.id
       WHERE r.property_id = $1 AND r.is_approved = TRUE
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [propertyId, Number(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM property_reviews WHERE property_id = $1 AND is_approved = TRUE',
      [propertyId]
    );

    // Get average rating
    const avgResult = await query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM property_reviews WHERE property_id = $1 AND is_approved = TRUE',
      [propertyId]
    );

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        summary: {
          averageRating: parseFloat(avgResult.rows[0].avg_rating) || 0,
          totalReviews: parseInt(avgResult.rows[0].total_reviews) || 0,
        },
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

// Get Review by ID
export const getReviewById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.*, t.full_name as tenant_name, p.property_name
       FROM property_reviews r
       JOIN tenants t ON r.tenant_id = t.id
       JOIN properties p ON r.property_id = p.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    res.json({
      success: true,
      data: {
        review: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Review (Tenant can update their review)
export const updateReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'tenant') {
      throw new AppError('Only tenants can update reviews', 403);
    }

    const { id } = req.params;
    const { rating, title, comment } = req.body;

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    // Verify review belongs to tenant
    const reviewResult = await query('SELECT * FROM property_reviews WHERE id = $1 AND tenant_id = $2', [
      id,
      tenantId,
    ]);
    if (reviewResult.rows.length === 0) {
      throw new AppError('Review not found or unauthorized', 404);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }
      paramCount++;
      updates.push(`rating = $${paramCount}`);
      params.push(rating);
    }
    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }
    if (comment !== undefined) {
      paramCount++;
      updates.push(`comment = $${paramCount}`);
      params.push(comment);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE property_reviews SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Review updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Approve/Reject Review (Admin/Owner)
export const approveReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'admin' && req.user.userType !== 'owner') {
      throw new AppError('Only admins and owners can approve reviews', 403);
    }

    const { id } = req.params;
    const { isApproved } = req.body;

    await query('UPDATE property_reviews SET is_approved = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      isApproved,
      id,
    ]);

    res.json({
      success: true,
      message: `Review ${isApproved ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Review
export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }

      const result = await query('DELETE FROM property_reviews WHERE id = $1 AND tenant_id = $2 RETURNING *', [
        id,
        tenantResult.rows[0].id,
      ]);

      if (result.rows.length === 0) {
        throw new AppError('Review not found or unauthorized', 404);
      }
    } else if (req.user.userType === 'admin') {
      // Admin can delete any review
      await query('DELETE FROM property_reviews WHERE id = $1', [id]);
    } else {
      throw new AppError('Unauthorized', 403);
    }

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

