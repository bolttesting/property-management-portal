import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import { notifications } from '../services/email/notifications';

// Get Super Admin Dashboard (See Everything)
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Get overall statistics (everything)
    const stats = await Promise.all([
      // Total property dealers (owners)
      query("SELECT COUNT(*) FROM owners WHERE owner_type IN ('management_company', 'real_estate_agency')"),
      // Pending property dealers
      query("SELECT COUNT(*) FROM owners WHERE status = 'pending_approval' AND owner_type IN ('management_company', 'real_estate_agency')"),
      // Active property dealers
      query("SELECT COUNT(*) FROM owners WHERE status = 'active' AND owner_type IN ('management_company', 'real_estate_agency')"),
      // Total properties (all dealers)
      query('SELECT COUNT(*) FROM properties'),
      // Total tenants (all dealers)
      query('SELECT COUNT(*) FROM tenants'),
      // Total applications
      query('SELECT COUNT(*) FROM applications'),
      // Active leases
      query("SELECT COUNT(*) FROM leases WHERE status = 'active'"),
      // Pending maintenance requests
      query("SELECT COUNT(*) FROM maintenance_requests WHERE status = 'pending'"),
    ]);

    res.json({
      success: true,
      data: {
        dashboard: {
          statistics: {
            totalPropertyDealers: parseInt(stats[0].rows[0].count),
            pendingPropertyDealers: parseInt(stats[1].rows[0].count),
            activePropertyDealers: parseInt(stats[2].rows[0].count),
            totalProperties: parseInt(stats[3].rows[0].count),
            totalTenants: parseInt(stats[4].rows[0].count),
            totalApplications: parseInt(stats[5].rows[0].count),
            activeLeases: parseInt(stats[6].rows[0].count),
            pendingMaintenanceRequests: parseInt(stats[7].rows[0].count),
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get All Users (Super Admin sees all)
export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userType, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (userType) {
      paramCount++;
      whereClause += ` AND user_type = $${paramCount}`;
      params.push(userType);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        users: result.rows,
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

// Get User by ID
export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update User Status
export const updateUserStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'active', 'suspended', 'inactive'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    await query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);

    res.json({
      success: true,
      message: 'User status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get All Property Dealers (Owners)
export const getOwners = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, ownerType, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "WHERE owner_type IN ('management_company', 'real_estate_agency')";
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (ownerType) {
      paramCount++;
      whereClause += ` AND o.owner_type = $${paramCount}`;
      params.push(ownerType);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT o.*, u.email, u.mobile, u.status as user_status,
       (SELECT COUNT(*) FROM properties WHERE owner_id = o.id) as total_properties,
       (SELECT COUNT(*) FROM tenants WHERE owner_id = o.id) as total_tenants
       FROM owners o
       JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM owners o ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        owners: result.rows,
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

// Get Pending Property Dealers (for approval)
export const getPendingOwners = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await query(
      `SELECT o.*, u.email, u.mobile, u.status as user_status
       FROM owners o
       JOIN users u ON o.user_id = u.id
       WHERE o.status = 'pending_approval' 
       AND o.owner_type IN ('management_company', 'real_estate_agency')
       ORDER BY o.created_at DESC`
    );

    res.json({
      success: true,
      data: {
        owners: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Approve Property Dealer
export const approveOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    // Get owner details
    const ownerResult = await query('SELECT * FROM owners WHERE id = $1', [id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner not found', 404);
    }

    const owner = ownerResult.rows[0];

    if (owner.status !== 'pending_approval') {
      throw new AppError('Owner is not pending approval', 400);
    }

    const ownerUserResult = await query('SELECT email FROM users WHERE id = $1', [owner.user_id]);
    const ownerEmail = ownerUserResult.rows[0]?.email || null;

    // Update owner status to approved and active
    await query(
      `UPDATE owners 
       SET status = 'active', approved_at = CURRENT_TIMESTAMP, approved_by = $1 
       WHERE id = $2`,
      [req.user.id, id]
    );

    // Update user status to active
    await query('UPDATE users SET status = $1 WHERE id = $2', ['active', owner.user_id]);

    // TODO: Send notification email to owner

    await notifications.ownerStatusEmail({
      email: ownerEmail,
      name: `${owner.first_name} ${owner.last_name}`.trim(),
      approved: true,
      dashboardUrl: 'https://propertyuae.com/owner/dashboard',
    });

    res.json({
      success: true,
      message: 'Property dealer approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reject Property Dealer
export const rejectOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Get owner details
    const ownerResult = await query('SELECT * FROM owners WHERE id = $1', [id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner not found', 404);
    }

    const owner = ownerResult.rows[0];

    const ownerUserResult = await query('SELECT email FROM users WHERE id = $1', [owner.user_id]);
    const ownerEmail = ownerUserResult.rows[0]?.email || null;

    // Update owner status to rejected
    await query(
      `UPDATE owners 
       SET status = 'rejected', approved_by = $1 
       WHERE id = $2`,
      [req.user.id, id]
    );

    // Update user status to inactive
    await query('UPDATE users SET status = $1 WHERE id = $2', ['inactive', owner.user_id]);

    // TODO: Send rejection email to owner with reason

    await notifications.ownerStatusEmail({
      email: ownerEmail,
      name: `${owner.first_name} ${owner.last_name}`.trim(),
      approved: false,
      reason: reason || null,
    });

    res.json({
      success: true,
      message: 'Property dealer rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get All Properties (Super Admin sees all properties from all dealers)
export const getAllProperties = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ownerId, status, location, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (ownerId) {
      paramCount++;
      whereClause += ` AND p.owner_id = $${paramCount}`;
      params.push(ownerId);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (location) {
      paramCount++;
      whereClause += ` AND (p.address->>'location' ILIKE $${paramCount} OR p.address->>'area' ILIKE $${paramCount})`;
      params.push(`%${location}%`);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT p.*, o.company_name, o.first_name, o.last_name, o.owner_type,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image,
       l.id as current_lease_id, l.start_date as lease_start_date, l.end_date as lease_end_date,
       t.id as current_tenant_id, t.full_name as current_tenant_name, u.email as current_tenant_email, u.mobile as current_tenant_mobile,
       a.id as approved_application_id, a.offer_amount
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       LEFT JOIN leases l ON p.id = l.property_id AND l.status = 'active'
       LEFT JOIN tenants t ON l.tenant_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN applications a ON a.property_id = p.id AND a.status = 'approved' AND (l.id IS NOT NULL AND a.id = l.application_id OR (p.listing_type = 'sale' AND p.status = 'sold'))
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM properties p ${whereClause}`,
      params.slice(0, -2)
    );

    // Parse JSONB fields for properties
    const properties = result.rows.map((prop: any) => {
      if (typeof prop.address === 'string') {
        try {
          prop.address = JSON.parse(prop.address);
        } catch {
          prop.address = {};
        }
      }
      if (typeof prop.features === 'string') {
        try {
          prop.features = JSON.parse(prop.features);
        } catch {
          prop.features = [];
        }
      }
      return prop;
    });

    res.json({
      success: true,
      data: {
        properties,
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

// Get Property by ID (Super Admin sees any property)
export const getPropertyById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, o.company_name, o.first_name, o.last_name, o.owner_type
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const imagesResult = await query(
      'SELECT * FROM property_images WHERE property_id = $1 ORDER BY image_order, created_at',
      [id]
    );

    res.json({
      success: true,
      data: {
        property: result.rows[0],
        images: imagesResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get All Applications (Super Admin sees all applications)
export const getAllApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, ownerId, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (ownerId) {
      paramCount++;
      whereClause += ` AND p.owner_id = $${paramCount}`;
      params.push(ownerId);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT a.*, p.property_name, p.address as property_address, p.owner_id,
       o.company_name as owner_company, o.first_name as owner_first_name, o.last_name as owner_last_name,
       t.full_name as tenant_name, u.email, u.mobile
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       JOIN owners o ON p.owner_id = o.id
       JOIN tenants t ON a.tenant_id = t.id
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM applications a
       JOIN properties p ON a.property_id = p.id
       ${whereClause}`,
      params.slice(0, -2)
    );

    // Parse JSONB fields for applications
    const applications = result.rows.map((app: any) => {
      if (typeof app.applicant_info === 'string') {
        try {
          app.applicant_info = JSON.parse(app.applicant_info);
        } catch {
          app.applicant_info = {};
        }
      }
      if (typeof app.employment_details === 'string') {
        try {
          app.employment_details = JSON.parse(app.employment_details);
        } catch {
          app.employment_details = {};
        }
      }
      if (typeof app.property_address === 'string') {
        try {
          app.property_address = JSON.parse(app.property_address);
        } catch {
          app.property_address = {};
        }
      }
      return app;
    });

    res.json({
      success: true,
      data: {
        applications,
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

// Get Application by ID
export const getApplicationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.*, p.property_name, p.address as property_address, p.owner_id,
       o.company_name as owner_company,
       t.full_name as tenant_name, t.email, t.mobile
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       JOIN owners o ON p.owner_id = o.id
       JOIN tenants t ON a.tenant_id = t.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Application not found', 404);
    }

    res.json({
      success: true,
      data: {
        application: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get All Tenants (Super Admin sees all tenants)
export const getAllTenants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ownerId, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (ownerId) {
      paramCount++;
      whereClause += ` AND t.owner_id = $${paramCount}`;
      params.push(ownerId);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT t.*, u.email, u.mobile, u.status as user_status,
       o.company_name as owner_company, o.first_name as owner_first_name, o.last_name as owner_last_name
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN owners o ON t.owner_id = o.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM tenants t ${whereClause}`,
      params.slice(0, -2)
    );

    // Parse JSONB fields for tenants
    const tenants = result.rows.map((tenant: any) => {
      if (typeof tenant.current_address === 'string') {
        try {
          tenant.current_address = JSON.parse(tenant.current_address);
        } catch {
          tenant.current_address = {};
        }
      }
      return tenant;
    });

    res.json({
      success: true,
      data: {
        tenants,
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

// Get Financial Reports (Super Admin sees all)
export const getFinancialReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate, ownerId } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (startDate && endDate) {
      paramCount++;
      whereClause += ` AND l.start_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
      whereClause += ` AND l.end_date <= $${paramCount}`;
      params.push(endDate);
    }

    if (ownerId) {
      paramCount++;
      whereClause += ` AND l.owner_id = $${paramCount}`;
      params.push(ownerId);
    }

    const result = await query(
      `SELECT 
       COALESCE(SUM(l.rent_amount), 0) as total_revenue,
       COALESCE(SUM(l.security_deposit), 0) as total_deposits,
       COUNT(*) as total_active_leases
       FROM leases l
       WHERE l.status = 'active' ${whereClause.replace('WHERE 1=1', '')}`,
      params
    );

    res.json({
      success: true,
      data: {
        reports: {
          totalRevenue: parseFloat(result.rows[0].total_revenue),
          totalSecurityDeposits: parseFloat(result.rows[0].total_deposits),
          totalActiveLeases: parseInt(result.rows[0].total_active_leases),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Property Status (Admin only)
export const updatePropertyStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      throw new AppError('Status is required', 400);
    }

    // Valid statuses
    const validStatuses = ['vacant', 'occupied', 'under_maintenance', 'unavailable', 'sold'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Get property
    const propertyResult = await query('SELECT * FROM properties WHERE id = $1', [id]);
    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const property = propertyResult.rows[0];

    // If changing from occupied/sold to vacant, update lease status if exists
    if ((property.status === 'occupied' || property.status === 'sold') && status === 'vacant') {
      // Find active lease for this property
      const leaseResult = await query(
        `SELECT id, application_id FROM leases WHERE property_id = $1 AND status = 'active'`,
        [id]
      );

      if (leaseResult.rows.length > 0) {
        const leaseRow = leaseResult.rows[0];

        // Terminate the lease
        await query(
          `UPDATE leases SET status = 'terminated', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [leaseRow.id]
        );

        // Cancel any pending rent payments for this lease
        await query(
          `UPDATE rent_payments
           SET payment_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE lease_id = $1 AND payment_status IN ('pending', 'overdue', 'partial')`,
          [leaseRow.id]
        );

        // Mark the approved application as cancelled so tenant can re-apply later
        if (leaseRow.application_id) {
          await query(
            `UPDATE applications
             SET status = 'cancelled', rejection_reason = COALESCE(rejection_reason, $2), updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [leaseRow.application_id, 'Lease ended and property set to vacant']
          );
        }
      }

      // Also update property's current_lease_id if it exists
      await query(
        `UPDATE properties SET current_lease_id = NULL WHERE id = $1`,
        [id]
      );
    }

    // Update property status
    await query(
      `UPDATE properties SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, id]
    );

    // Return updated property with tenant info
    const updatedPropertyResult = await query(
      `SELECT p.*, o.company_name, o.first_name, o.last_name,
       l.id as current_lease_id, l.start_date as lease_start_date, l.end_date as lease_end_date,
       t.id as current_tenant_id, t.full_name as current_tenant_name, u.email as current_tenant_email, u.mobile as current_tenant_mobile
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       LEFT JOIN leases l ON p.current_lease_id = l.id AND l.status = 'active'
       LEFT JOIN tenants t ON l.tenant_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    const updatedProperty = updatedPropertyResult.rows[0];

    // Parse JSONB fields
    if (typeof updatedProperty.address === 'string') {
      try {
        updatedProperty.address = JSON.parse(updatedProperty.address);
      } catch {
        updatedProperty.address = {};
      }
    }

    res.json({
      success: true,
      message: `Property status updated to ${status}`,
      data: {
        property: updatedProperty,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Property Reports
export const getPropertyReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM properties
      GROUP BY status
    `);

    const ownerStats = await query(`
      SELECT 
        o.id,
        o.company_name,
        COUNT(p.id) as total_properties,
        COUNT(CASE WHEN p.status = 'occupied' THEN 1 END) as occupied_properties,
        COUNT(CASE WHEN p.status = 'vacant' THEN 1 END) as vacant_properties
      FROM owners o
      LEFT JOIN properties p ON o.id = p.owner_id
      WHERE o.owner_type IN ('management_company', 'real_estate_agency')
      GROUP BY o.id, o.company_name
      ORDER BY total_properties DESC
    `);

    res.json({
      success: true,
      data: {
        reports: {
          propertyStatusBreakdown: result.rows,
          dealerStatistics: ownerStats.rows,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
