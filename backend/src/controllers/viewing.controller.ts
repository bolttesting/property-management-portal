import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { notifications } from '../services/email/notifications';

// Create Scheduled Viewing
export const createViewing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { propertyId, viewingDate, viewingTime, applicantName, applicantEmail, applicantMobile, notes } = req.body;

    if (!propertyId || !viewingDate || !viewingTime) {
      throw new AppError('Property ID, viewing date, and time are required', 400);
    }

    const propertyResult = await query(
      `SELECT p.property_name,
              o.first_name,
              o.last_name,
              o.company_name,
              u.email as owner_email
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE p.id = $1`,
      [propertyId]
    );

    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const propertyInfo = propertyResult.rows[0];

    // If tenant is logged in, use their info
    let tenantId = null;
    let name = applicantName;
    let email = applicantEmail;
    let mobile = applicantMobile;

    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id, full_name FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length > 0) {
        tenantId = tenantResult.rows[0].id;
        if (!name) name = tenantResult.rows[0].full_name;
      }
      const userResult = await query('SELECT email, mobile FROM users WHERE id = $1', [req.user.id]);
      if (userResult.rows.length > 0) {
        if (!email) email = userResult.rows[0].email;
        if (!mobile) mobile = userResult.rows[0].mobile;
      }
    }

    const viewingId = uuidv4();
    await query(
      `INSERT INTO scheduled_viewings (
        id, property_id, tenant_id, applicant_name, applicant_email,
        applicant_mobile, viewing_date, viewing_time, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        viewingId,
        propertyId,
        tenantId,
        name,
        email,
        mobile,
        viewingDate,
        viewingTime,
        notes || null,
        'scheduled',
      ]
    );

    await notifications.viewingScheduled({
      recipientEmail: propertyInfo.owner_email || null,
      recipientName:
        propertyInfo.company_name ||
        `${propertyInfo.first_name || ''} ${propertyInfo.last_name || ''}`.trim() ||
        propertyInfo.owner_email ||
        null,
      propertyName: propertyInfo.property_name || null,
      viewingDate,
      viewingTime,
      applicantName: name || null,
      applicantEmail: email || null,
      applicantMobile: mobile || null,
      notes: notes || null,
    });

    await notifications.viewingScheduled({
      recipientEmail: email || null,
      recipientName: name || null,
      propertyName: propertyInfo.property_name || null,
      viewingDate,
      viewingTime,
      applicantName: name || null,
      applicantEmail: email || null,
      applicantMobile: mobile || null,
      notes: notes || null,
    });

    res.status(201).json({
      success: true,
      message: 'Viewing scheduled successfully',
      data: {
        viewingId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Viewings
export const getViewings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { propertyId, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }
      whereClause = 'WHERE sv.tenant_id = $1';
      params.push(tenantResult.rows[0].id);
      paramCount = 1;
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0) {
        throw new AppError('Owner profile not found', 404);
      }
      // Owner can see viewings for their properties
      whereClause = 'WHERE p.owner_id = $1';
      params.push(ownerResult.rows[0].id);
      paramCount = 1;
    } else if (req.user.userType === 'admin') {
      whereClause = 'WHERE 1=1';
    } else {
      throw new AppError('Unauthorized', 403);
    }

    if (propertyId) {
      paramCount++;
      whereClause += ` AND sv.property_id = $${paramCount}`;
      params.push(propertyId);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND sv.status = $${paramCount}`;
      params.push(status);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT sv.*, p.property_name, p.address as property_address,
       o.company_name as owner_company
       FROM scheduled_viewings sv
       JOIN properties p ON sv.property_id = p.id
       JOIN owners o ON p.owner_id = o.id
       ${whereClause}
       ORDER BY sv.viewing_date DESC, sv.viewing_time DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM scheduled_viewings sv
       ${req.user.userType === 'owner' ? 'JOIN properties p ON sv.property_id = p.id' : ''}
       ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        viewings: result.rows,
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

// Get Viewing by ID
export const getViewingById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query(
      `SELECT sv.*, p.property_name, p.address as property_address, p.owner_id,
       o.company_name as owner_company
       FROM scheduled_viewings sv
       JOIN properties p ON sv.property_id = p.id
       JOIN owners o ON p.owner_id = o.id
       WHERE sv.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Viewing not found', 404);
    }

    const viewing = result.rows[0];

    // Check authorization
    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0 || viewing.tenant_id !== tenantResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || viewing.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    res.json({
      success: true,
      data: {
        viewing,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Viewing Status
export const updateViewingStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    if (!status || !['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Get viewing
    const viewingResult = await query(
      `SELECT sv.*,
              p.owner_id,
              p.property_name,
              o.first_name as owner_first_name,
              o.last_name as owner_last_name,
              o.company_name as owner_company,
              ou.email as owner_email,
              t.full_name as tenant_full_name,
              tu.email as tenant_email
       FROM scheduled_viewings sv
       JOIN properties p ON sv.property_id = p.id
       JOIN owners o ON p.owner_id = o.id
       JOIN users ou ON o.user_id = ou.id
       LEFT JOIN tenants t ON sv.tenant_id = t.id
       LEFT JOIN users tu ON t.user_id = tu.id
       WHERE sv.id = $1`,
      [id]
    );

    if (viewingResult.rows.length === 0) {
      throw new AppError('Viewing not found', 404);
    }

    const viewing = viewingResult.rows[0];

    // Check authorization
    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0 || viewing.tenant_id !== tenantResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || viewing.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Build update query
    const updates: string[] = ['status = $1'];
    const params: any[] = [status];
    let paramCount = 1;

    if (status === 'confirmed') {
      updates.push(`confirmed_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'cancelled') {
      updates.push(`cancelled_at = CURRENT_TIMESTAMP`);
      if (cancellationReason) {
        paramCount++;
        updates.push(`cancellation_reason = $${paramCount}`);
        params.push(cancellationReason);
      }
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE scheduled_viewings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    const propertyName = viewing.property_name || 'the property';
    const tenantEmail = viewing.tenant_email || viewing.applicant_email || null;
    const tenantName =
      viewing.tenant_full_name || viewing.applicant_name || tenantEmail || 'Applicant';
    const ownerEmail = viewing.owner_email || null;
    const ownerName =
      viewing.owner_company ||
      `${viewing.owner_first_name || ''} ${viewing.owner_last_name || ''}`.trim() ||
      ownerEmail ||
      'Owner';
    const statusLabel = status.replace(/_/g, ' ');

    await notifications.viewingStatusUpdated({
      recipientEmail: tenantEmail,
      recipientName: tenantName,
      propertyName,
      status: statusLabel,
      cancellationReason: status === 'cancelled' ? cancellationReason || null : null,
      nextSteps:
        status === 'confirmed'
          ? 'Please arrive a few minutes early and bring your identification for security.'
          : status === 'cancelled'
          ? 'You can schedule another viewing from your dashboard if you wish.'
          : null,
    });

    await notifications.viewingStatusUpdated({
      recipientEmail: ownerEmail,
      recipientName: ownerName,
      propertyName,
      status: statusLabel,
      cancellationReason: status === 'cancelled' ? cancellationReason || null : null,
      nextSteps:
        status === 'cancelled'
          ? `${tenantName} cancelled the viewing.`
          : status === 'confirmed'
          ? `${tenantName} confirmed the viewing.`
          : null,
    });

    res.json({
      success: true,
      message: 'Viewing status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Cancel Viewing
export const cancelViewing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;
    const { cancellationReason } = req.body;

    // Get viewing
    const viewingResult = await query(
      `SELECT sv.*,
              p.owner_id,
              p.property_name,
              o.first_name as owner_first_name,
              o.last_name as owner_last_name,
              o.company_name as owner_company,
              ou.email as owner_email,
              t.full_name as tenant_full_name,
              tu.email as tenant_email
       FROM scheduled_viewings sv
       JOIN properties p ON sv.property_id = p.id
       JOIN owners o ON p.owner_id = o.id
       JOIN users ou ON o.user_id = ou.id
       LEFT JOIN tenants t ON sv.tenant_id = t.id
       LEFT JOIN users tu ON t.user_id = tu.id
       WHERE sv.id = $1`,
      [id]
    );

    if (viewingResult.rows.length === 0) {
      throw new AppError('Viewing not found', 404);
    }

    const viewing = viewingResult.rows[0];

    if (viewing.status === 'completed' || viewing.status === 'cancelled') {
      throw new AppError('Cannot cancel a completed or already cancelled viewing', 400);
    }

    // Check authorization
    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0 || viewing.tenant_id !== tenantResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || viewing.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    await query(
      `UPDATE scheduled_viewings 
       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, 
           cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [cancellationReason || null, id]
    );

    const propertyName = viewing.property_name || 'the property';
    const tenantEmail = viewing.tenant_email || viewing.applicant_email || null;
    const tenantName =
      viewing.tenant_full_name || viewing.applicant_name || tenantEmail || 'Applicant';
    const ownerEmail = viewing.owner_email || null;
    const ownerName =
      viewing.owner_company ||
      `${viewing.owner_first_name || ''} ${viewing.owner_last_name || ''}`.trim() ||
      ownerEmail ||
      'Owner';

    await notifications.viewingStatusUpdated({
      recipientEmail: tenantEmail,
      recipientName: tenantName,
      propertyName,
      status: 'cancelled',
      cancellationReason: cancellationReason || null,
      nextSteps: 'You can schedule another viewing from your dashboard if needed.',
    });

    await notifications.viewingStatusUpdated({
      recipientEmail: ownerEmail,
      recipientName: ownerName,
      propertyName,
      status: 'cancelled',
      cancellationReason: cancellationReason || null,
      nextSteps: `${tenantName} cancelled the viewing.`,
    });

    res.json({
      success: true,
      message: 'Viewing cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

