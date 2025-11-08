import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

// Create Rent Payment
export const createRentPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can create rent payments', 403);
    }

    const { leaseId, amount, paymentDate, dueDate, paymentMethod, transactionReference, notes } = req.body;

    if (!leaseId || !amount || !dueDate) {
      throw new AppError('Lease ID, amount, and due date are required', 400);
    }

    // Get lease details
    const leaseResult = await query(
      `SELECT l.*, p.owner_id FROM leases l
       JOIN properties p ON l.property_id = p.id
       WHERE l.id = $1`,
      [leaseId]
    );

    if (leaseResult.rows.length === 0) {
      throw new AppError('Lease not found', 404);
    }

    const lease = leaseResult.rows[0];

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || lease.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    const paymentId = uuidv4();
    await query(
      `INSERT INTO rent_payments (
        id, lease_id, tenant_id, property_id, owner_id,
        amount, payment_date, due_date, payment_method,
        payment_status, transaction_reference, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        paymentId,
        leaseId,
        lease.tenant_id,
        lease.property_id,
        lease.owner_id,
        amount,
        paymentDate || new Date().toISOString().split('T')[0],
        dueDate,
        paymentMethod || null,
        paymentDate ? 'paid' : 'pending',
        transactionReference || null,
        notes || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Rent payment created successfully',
      data: {
        paymentId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Rent Payments (tenant or owner)
export const getRentPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { leaseId, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }
      whereClause = 'WHERE rp.tenant_id = $1';
      params.push(tenantResult.rows[0].id);
      paramCount = 1;
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0) {
        throw new AppError('Owner profile not found', 404);
      }
      whereClause = 'WHERE rp.owner_id = $1';
      params.push(ownerResult.rows[0].id);
      paramCount = 1;
    } else if (req.user.userType === 'admin') {
      whereClause = 'WHERE 1=1';
    } else {
      throw new AppError('Unauthorized', 403);
    }

    if (leaseId) {
      paramCount++;
      whereClause += ` AND rp.lease_id = $${paramCount}`;
      params.push(leaseId);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND rp.payment_status = $${paramCount}`;
      params.push(status);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT rp.*, p.property_name, p.address as property_address,
       t.full_name as tenant_name, l.start_date as lease_start_date, l.end_date as lease_end_date
       FROM rent_payments rp
       JOIN properties p ON rp.property_id = p.id
       JOIN tenants t ON rp.tenant_id = t.id
       JOIN leases l ON rp.lease_id = l.id
       ${whereClause}
       ORDER BY rp.due_date DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM rent_payments rp ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        payments: result.rows,
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

// Get Rent Payment by ID
export const getRentPaymentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query(
      `SELECT rp.*, p.property_name, p.address as property_address,
       t.full_name as tenant_name, l.start_date as lease_start_date, l.end_date as lease_end_date
       FROM rent_payments rp
       JOIN properties p ON rp.property_id = p.id
       JOIN tenants t ON rp.tenant_id = t.id
       JOIN leases l ON rp.lease_id = l.id
       WHERE rp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Rent payment not found', 404);
    }

    const payment = result.rows[0];

    // Check authorization
    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0 || payment.tenant_id !== tenantResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || payment.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    res.json({
      success: true,
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Rent Payment Status
export const updateRentPaymentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can update payment status', 403);
    }

    const { id } = req.params;
    const { paymentStatus, paymentDate, transactionReference, receiptUrl, notes } = req.body;

    if (!paymentStatus || !['pending', 'paid', 'overdue', 'partial', 'cancelled'].includes(paymentStatus)) {
      throw new AppError('Invalid payment status', 400);
    }

    // Get payment
    const paymentResult = await query('SELECT * FROM rent_payments WHERE id = $1', [id]);
    if (paymentResult.rows.length === 0) {
      throw new AppError('Rent payment not found', 404);
    }

    const payment = paymentResult.rows[0];

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || payment.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Build update query
    const updates: string[] = ['payment_status = $1'];
    const params: any[] = [paymentStatus];
    let paramCount = 1;

    if (paymentDate !== undefined) {
      paramCount++;
      updates.push(`payment_date = $${paramCount}`);
      params.push(paymentDate);
    }
    if (transactionReference !== undefined) {
      paramCount++;
      updates.push(`transaction_reference = $${paramCount}`);
      params.push(transactionReference);
    }
    if (receiptUrl !== undefined) {
      paramCount++;
      updates.push(`receipt_url = $${paramCount}`);
      params.push(receiptUrl);
    }
    if (notes !== undefined) {
      paramCount++;
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE rent_payments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Rent payment updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get Rent Payment History Summary
export const getPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { leaseId } = req.query;

    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }
      whereClause = 'WHERE rp.tenant_id = $1';
      params.push(tenantResult.rows[0].id);
      paramCount = 1;
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0) {
        throw new AppError('Owner profile not found', 404);
      }
      whereClause = 'WHERE rp.owner_id = $1';
      params.push(ownerResult.rows[0].id);
      paramCount = 1;
    }

    if (leaseId) {
      paramCount++;
      whereClause += ` AND rp.lease_id = $${paramCount}`;
      params.push(leaseId);
    }

    // Get summary statistics
    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN payment_status = 'overdue' THEN amount ELSE 0 END), 0) as total_overdue
       FROM rent_payments rp
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

