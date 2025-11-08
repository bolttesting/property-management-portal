import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { notifications } from '../services/email/notifications';

// Create Lease (from approved application)
export const createLease = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can create leases', 403);
    }

    const { applicationId, startDate, endDate, rentAmount, securityDeposit, ejariNumber, terms } = req.body;

    // Validation
    if (!applicationId || !startDate || !endDate || !rentAmount || !securityDeposit) {
      throw new AppError('Missing required fields', 400);
    }

    // Get application
    const appResult = await query(
      `SELECT a.*, 
              p.owner_id, 
              p.id as property_id, 
              p.status as property_status,
              p.property_name,
              t.full_name as tenant_full_name,
              tu.email as tenant_email,
              o.first_name as owner_first_name,
              o.last_name as owner_last_name,
              o.company_name as owner_company,
              ou.email as owner_email
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       JOIN tenants t ON a.tenant_id = t.id
       JOIN users tu ON t.user_id = tu.id
       JOIN owners o ON p.owner_id = o.id
       JOIN users ou ON o.user_id = ou.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      throw new AppError('Application not found', 404);
    }

    const application = appResult.rows[0];

    if (application.status !== 'approved') {
      throw new AppError('Application must be approved before creating lease', 400);
    }

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || application.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Check if property is available
    if (application.property_status === 'occupied') {
      throw new AppError('Property is already occupied', 400);
    }

    // Create lease
    const leaseId = uuidv4();
    await query(
      `INSERT INTO leases (
        id, application_id, property_id, tenant_id, owner_id,
        start_date, end_date, rent_amount, security_deposit,
        ejari_number, ejari_status, status, terms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        leaseId,
        applicationId,
        application.property_id,
        application.tenant_id,
        application.owner_id,
        startDate,
        endDate,
        rentAmount,
        securityDeposit,
        ejariNumber || null,
        ejariNumber ? 'registered' : 'pending',
        'active',
        terms ? JSON.stringify(terms) : null,
      ]
    );

    // Update property status to occupied
    await query('UPDATE properties SET status = $1, current_lease_id = $2 WHERE id = $3', [
      'occupied',
      leaseId,
      application.property_id,
    ]);

    await notifications.leaseNotification({
      recipientEmail: application.tenant_email || null,
      recipientName: application.tenant_full_name || application.tenant_email || 'Tenant',
      propertyName: application.property_name || null,
      action: 'created',
      startDate,
      endDate,
      rentAmount,
    });

    await notifications.leaseNotification({
      recipientEmail: application.owner_email || null,
      recipientName:
        application.owner_company ||
        `${application.owner_first_name || ''} ${application.owner_last_name || ''}`.trim() ||
        application.owner_email ||
        'Owner',
      propertyName: application.property_name || null,
      action: 'created',
      startDate,
      endDate,
      rentAmount,
    });

    res.status(201).json({
      success: true,
      message: 'Lease created successfully',
      data: {
        leaseId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Leases (for tenant or owner)
export const getLeases = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }
      whereClause = 'WHERE l.tenant_id = $1';
      params.push(tenantResult.rows[0].id);
      paramCount = 1;
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0) {
        throw new AppError('Owner profile not found', 404);
      }
      whereClause = 'WHERE l.owner_id = $1';
      params.push(ownerResult.rows[0].id);
      paramCount = 1;
    } else if (req.user.userType === 'admin') {
      whereClause = 'WHERE 1=1';
    } else {
      throw new AppError('Unauthorized', 403);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND l.status = $${paramCount}`;
      params.push(status);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT l.*, p.property_name, p.address as property_address,
       t.full_name as tenant_name, t.email, t.mobile,
       o.company_name as owner_company
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       JOIN owners o ON l.owner_id = o.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM leases l ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        leases: result.rows,
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

// Get Lease by ID
export const getLeaseById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query(
      `SELECT l.*, p.property_name, p.address as property_address,
       t.full_name as tenant_name, t.email, t.mobile,
       o.company_name as owner_company
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       JOIN owners o ON l.owner_id = o.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Lease not found', 404);
    }

    const lease = result.rows[0];

    // Check authorization
    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0 || lease.tenant_id !== tenantResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || lease.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    res.json({
      success: true,
      data: {
        lease,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Lease
export const updateLease = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can update leases', 403);
    }

    const { id } = req.params;
    const { rentAmount, terms, ejariNumber, ejariStatus } = req.body;

    // Get lease
    const leaseResult = await query(
      `SELECT l.*,
              p.property_name,
              t.full_name as tenant_full_name,
              tu.email as tenant_email,
              o.first_name as owner_first_name,
              o.last_name as owner_last_name,
              o.company_name as owner_company,
              ou.email as owner_email
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       JOIN users tu ON t.user_id = tu.id
       JOIN owners o ON l.owner_id = o.id
       JOIN users ou ON o.user_id = ou.id
       WHERE l.id = $1`,
      [id]
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

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (rentAmount !== undefined) {
      paramCount++;
      updates.push(`rent_amount = $${paramCount}`);
      params.push(rentAmount);
    }
    if (terms !== undefined) {
      paramCount++;
      updates.push(`terms = $${paramCount}`);
      params.push(JSON.stringify(terms));
    }
    if (ejariNumber !== undefined) {
      paramCount++;
      updates.push(`ejari_number = $${paramCount}`);
      params.push(ejariNumber);
    }
    if (ejariStatus !== undefined) {
      paramCount++;
      updates.push(`ejari_status = $${paramCount}`);
      params.push(ejariStatus);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE leases SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    const propertyName = lease.property_name || null;
    const tenantEmail = lease.tenant_email || null;
    const tenantName = lease.tenant_full_name || lease.tenant_email || 'Tenant';
    const ownerEmail = lease.owner_email || null;
    const ownerName =
      lease.owner_company ||
      `${lease.owner_first_name || ''} ${lease.owner_last_name || ''}`.trim() ||
      ownerEmail ||
      'Owner';

    await notifications.leaseNotification({
      recipientEmail: tenantEmail,
      recipientName: tenantName,
      propertyName,
      action: 'updated',
      rentAmount: rentAmount ?? null,
      additionalNotes: 'Lease details have been updated by the property owner.',
    });

    await notifications.leaseNotification({
      recipientEmail: ownerEmail,
      recipientName: ownerName,
      propertyName,
      action: 'updated',
      rentAmount: rentAmount ?? null,
      additionalNotes: 'You updated the lease details.',
    });

    res.json({
      success: true,
      message: 'Lease updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Renew Lease
export const renewLease = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can renew leases', 403);
    }

    const { id } = req.params;
    const { endDate, rentAmount } = req.body;

    if (!endDate) {
      throw new AppError('End date is required', 400);
    }

    // Get lease
    const leaseResult = await query(
      `SELECT l.*,
              p.property_name,
              t.full_name as tenant_full_name,
              tu.email as tenant_email,
              o.first_name as owner_first_name,
              o.last_name as owner_last_name,
              o.company_name as owner_company,
              ou.email as owner_email
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       JOIN users tu ON t.user_id = tu.id
       JOIN owners o ON l.owner_id = o.id
       JOIN users ou ON o.user_id = ou.id
       WHERE l.id = $1`,
      [id]
    );
    if (leaseResult.rows.length === 0) {
      throw new AppError('Lease not found', 404);
    }

    const lease = leaseResult.rows[0];

    if (lease.status !== 'active') {
      throw new AppError('Can only renew active leases', 400);
    }

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || lease.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Create new lease (renewal)
    const newLeaseId = uuidv4();
    await query(
      `INSERT INTO leases (
        id, property_id, tenant_id, owner_id,
        start_date, end_date, rent_amount, security_deposit,
        status, ejari_number, ejari_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        newLeaseId,
        lease.property_id,
        lease.tenant_id,
        lease.owner_id,
        lease.end_date, // Start from old lease end date
        endDate,
        rentAmount || lease.rent_amount,
        lease.security_deposit,
        'active',
        lease.ejari_number,
        lease.ejari_status,
      ]
    );

    // Update old lease status
    await query('UPDATE leases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      'renewed',
      id,
    ]);

    // Update property current_lease_id
    await query('UPDATE properties SET current_lease_id = $1 WHERE id = $2', [
      newLeaseId,
      lease.property_id,
    ]);

    await notifications.leaseNotification({
      recipientEmail: lease.tenant_email || null,
      recipientName: lease.tenant_full_name || lease.tenant_email || 'Tenant',
      propertyName: lease.property_name || null,
      action: 'renewed',
      startDate: lease.end_date,
      endDate,
      rentAmount: rentAmount || lease.rent_amount,
      additionalNotes: 'Your lease has been renewed. Please review the updated dates.',
    });

    await notifications.leaseNotification({
      recipientEmail: lease.owner_email || null,
      recipientName:
        lease.owner_company ||
        `${lease.owner_first_name || ''} ${lease.owner_last_name || ''}`.trim() ||
        lease.owner_email ||
        'Owner',
      propertyName: lease.property_name || null,
      action: 'renewed',
      startDate: lease.end_date,
      endDate,
      rentAmount: rentAmount || lease.rent_amount,
      additionalNotes: 'You renewed this lease. The tenant has been notified.',
    });

    res.json({
      success: true,
      message: 'Lease renewed successfully',
      data: {
        leaseId: newLeaseId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Terminate Lease
export const terminateLease = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can terminate leases', 403);
    }

    const { id } = req.params;
    const { terminationReason, moveOutInspection } = req.body;

    // Get lease
    const leaseResult = await query(
      `SELECT l.*,
              p.property_name,
              t.full_name as tenant_full_name,
              tu.email as tenant_email,
              o.first_name as owner_first_name,
              o.last_name as owner_last_name,
              o.company_name as owner_company,
              ou.email as owner_email
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       JOIN users tu ON t.user_id = tu.id
       JOIN owners o ON l.owner_id = o.id
       JOIN users ou ON o.user_id = ou.id
       WHERE l.id = $1`,
      [id]
    );
    if (leaseResult.rows.length === 0) {
      throw new AppError('Lease not found', 404);
    }

    const lease = leaseResult.rows[0];

    if (lease.status !== 'active') {
      throw new AppError('Can only terminate active leases', 400);
    }

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || lease.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Update lease
    const updates: string[] = ['status = $1'];
    const params: any[] = ['terminated'];
    let paramCount = 1;

    if (moveOutInspection) {
      paramCount++;
      updates.push(`move_out_inspection = $${paramCount}`);
      params.push(JSON.stringify(moveOutInspection));
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE leases SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    // Update property status to vacant
    await query('UPDATE properties SET status = $1, current_lease_id = NULL WHERE id = $2', [
      'vacant',
      lease.property_id,
    ]);

    await notifications.leaseNotification({
      recipientEmail: lease.tenant_email || null,
      recipientName: lease.tenant_full_name || lease.tenant_email || 'Tenant',
      propertyName: lease.property_name || null,
      action: 'terminated',
      additionalNotes: terminationReason || 'The lease has been terminated.',
    });

    await notifications.leaseNotification({
      recipientEmail: lease.owner_email || null,
      recipientName:
        lease.owner_company ||
        `${lease.owner_first_name || ''} ${lease.owner_last_name || ''}`.trim() ||
        lease.owner_email ||
        'Owner',
      propertyName: lease.property_name || null,
      action: 'terminated',
      additionalNotes: terminationReason || 'The lease has been marked as terminated.',
    });

    res.json({
      success: true,
      message: 'Lease terminated successfully',
    });
  } catch (error) {
    next(error);
  }
};

