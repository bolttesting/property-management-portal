import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query, pool } from '../database/connection';
import { emailService } from '../services/email/email.service';

// Get Tenant Dashboard
export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    // Get statistics
    const stats = await Promise.all([
      query('SELECT COUNT(*) FROM applications WHERE tenant_id = $1', [tenantId]),
      query("SELECT COUNT(*) FROM applications WHERE tenant_id = $1 AND status = 'approved'", [tenantId]),
      query("SELECT COUNT(*) FROM leases WHERE tenant_id = $1 AND status = 'active'", [tenantId]),
      query("SELECT COUNT(*) FROM maintenance_requests WHERE tenant_id = $1 AND status = 'pending'", [tenantId]),
      query("SELECT COUNT(*) FROM maintenance_requests WHERE tenant_id = $1 AND status = 'in_progress'", [tenantId]),
      query('SELECT COUNT(*) FROM property_favorites WHERE tenant_id = $1', [tenantId]),
    ]);

    // Get recent applications
    const applicationsResult = await query(
      `SELECT a.*, p.property_name, p.address as property_address, p.price
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       WHERE a.tenant_id = $1
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [tenantId]
    );

    // Get active leases
    const leasesResult = await query(
      `SELECT l.*, p.property_name, p.address as property_address
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       WHERE l.tenant_id = $1 AND l.status = 'active'
       ORDER BY l.start_date DESC`,
      [tenantId]
    );

    let rentPaymentsRows: any[] = [];
    try {
      const rentPaymentsResult = await query(
        `SELECT rp.*, p.property_name
         FROM rent_payments rp
         JOIN properties p ON rp.property_id = p.id
         WHERE rp.tenant_id = $1 AND rp.payment_status IN ('pending', 'overdue')
         ORDER BY rp.due_date ASC
         LIMIT 5`,
        [tenantId]
      );
      rentPaymentsRows = rentPaymentsResult.rows;
    } catch (error) {
      console.warn('Failed to load tenant rent payments:', error);
    }

    const activeLeases = leasesResult.rows.map((lease: any) => {
      if (lease.payment_plan && typeof lease.payment_plan === 'string') {
        try {
          lease.payment_plan = JSON.parse(lease.payment_plan);
        } catch {
          // leave as string if parsing fails
        }
      }
      return lease;
    });

    res.json({
      success: true,
      data: {
        dashboard: {
          statistics: {
            totalApplications: parseInt(stats[0].rows[0].count),
            approvedApplications: parseInt(stats[1].rows[0].count),
            activeLeases: parseInt(stats[2].rows[0].count),
            pendingMaintenanceRequests: parseInt(stats[3].rows[0].count),
            inProgressMaintenanceRequests: parseInt(stats[4].rows[0].count),
            favoriteProperties: parseInt(stats[5].rows[0].count),
          },
          recentApplications: applicationsResult.rows,
          activeLeases,
          upcomingRentPayments: rentPaymentsRows,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Tenant Profile
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const result = await query(
      `SELECT t.*, u.email, u.mobile, u.status as user_status, u.email_verified, u.mobile_verified
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }

    res.json({
      success: true,
      data: {
        profile: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Tenant Profile
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const {
      fullName,
      nationality,
      employmentStatus,
      emiratesId,
      passportNumber,
      visaNumber,
      currentAddress,
      dateOfBirth,
      emergencyContact,
    } = req.body;

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (fullName !== undefined) {
      paramCount++;
      updates.push(`full_name = $${paramCount}`);
      params.push(fullName || null);
    }
    if (nationality !== undefined) {
      paramCount++;
      updates.push(`nationality = $${paramCount}`);
      params.push(nationality || null);
    }
    if (employmentStatus !== undefined) {
      paramCount++;
      updates.push(`employment_status = $${paramCount}`);
      params.push(employmentStatus || null);
    }
    if (emiratesId !== undefined) {
      const normalizedEmiratesId =
        typeof emiratesId === 'string' ? emiratesId.trim() : emiratesId;
      if (normalizedEmiratesId) {
        const existingEmiratesId = await query(
          'SELECT id FROM tenants WHERE emirates_id = $1 AND id != $2',
          [normalizedEmiratesId, tenantId]
        );
        if (existingEmiratesId.rows.length > 0) {
          throw new AppError('Emirates ID already in use', 400);
        }
      }
      paramCount++;
      updates.push(`emirates_id = $${paramCount}`);
      params.push(normalizedEmiratesId || null);
    }
    if (passportNumber !== undefined) {
      paramCount++;
      updates.push(`passport_number = $${paramCount}`);
      params.push(passportNumber || null);
    }
    if (visaNumber !== undefined) {
      paramCount++;
      updates.push(`visa_number = $${paramCount}`);
      params.push(visaNumber || null);
    }
    if (currentAddress !== undefined) {
      paramCount++;
      updates.push(`current_address = $${paramCount}`);
      params.push(currentAddress ? JSON.stringify(currentAddress) : null);
    }
    if (dateOfBirth !== undefined) {
      paramCount++;
      updates.push(`date_of_birth = $${paramCount}`);
      if (dateOfBirth) {
        const parsedDate = new Date(dateOfBirth);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new AppError('Invalid date of birth', 400);
        }
        params.push(parsedDate.toISOString().split('T')[0]);
      } else {
        params.push(null);
      }
    }
    if (emergencyContact !== undefined) {
      paramCount++;
      updates.push(`emergency_contact = $${paramCount}`);
      params.push(emergencyContact ? JSON.stringify(emergencyContact) : null);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(tenantId);

    // Calculate profile completion
    const profileCompletion = await calculateProfileCompletion(tenantId);

    paramCount++;
    updates.push(`profile_completion = $${paramCount}`);
    params.push(profileCompletion);

    await query(
      `UPDATE tenants SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount - 1}`,
      params
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate profile completion
async function calculateProfileCompletion(tenantId: string): Promise<number> {
  const result = await query(
    `SELECT 
      CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 ELSE 0 END as has_name,
      CASE WHEN nationality IS NOT NULL THEN 1 ELSE 0 END as has_nationality,
      CASE WHEN employment_status IS NOT NULL THEN 1 ELSE 0 END as has_employment,
      CASE WHEN emirates_id IS NOT NULL THEN 1 ELSE 0 END as has_emirates_id,
      CASE WHEN passport_number IS NOT NULL THEN 1 ELSE 0 END as has_passport,
      CASE WHEN current_address IS NOT NULL THEN 1 ELSE 0 END as has_address,
      CASE WHEN date_of_birth IS NOT NULL THEN 1 ELSE 0 END as has_dob,
      CASE WHEN emergency_contact IS NOT NULL THEN 1 ELSE 0 END as has_emergency_contact
     FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (result.rows.length === 0) return 0;

  const row = result.rows[0];
  const totalFields = 8;
  const completedFields =
    parseInt(row.has_name) +
    parseInt(row.has_nationality) +
    parseInt(row.has_employment) +
    parseInt(row.has_emirates_id) +
    parseInt(row.has_passport) +
    parseInt(row.has_address) +
    parseInt(row.has_dob) +
    parseInt(row.has_emergency_contact);

  return Math.round((completedFields / totalFields) * 100);
}

// Get Tenant Applications
export const getApplications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    let whereClause = 'WHERE a.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT a.*, p.property_name, p.address as property_address, p.price,
       o.company_name as owner_company
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       JOIN owners o ON p.owner_id = o.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM applications a ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        applications: result.rows,
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

// Get Tenant Leases
export const getLeases = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    let whereClause = 'WHERE l.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 1;

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
       o.company_name as owner_company
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN owners o ON l.owner_id = o.id
       ${whereClause}
       ORDER BY l.start_date DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM leases l ${whereClause}`,
      params.slice(0, -2)
    );

    const leases = result.rows.map((lease: any) => {
      if (lease.payment_plan && typeof lease.payment_plan === 'string') {
        try {
          lease.payment_plan = JSON.parse(lease.payment_plan);
        } catch {
          // keep as is
        }
      }
      return lease;
    });

    res.json({
      success: true,
      data: {
        leases,
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

// Update Maintenance Request Status (Owner/Admin)
export const updateMaintenanceRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can update maintenance requests', 403);
    }

    const { id } = req.params;
    const { status, assignedTo } = req.body;

    if (!status || !['pending', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Get maintenance request
    const mrResult = await query(
      `SELECT mr.*, p.owner_id FROM maintenance_requests mr
       JOIN properties p ON mr.property_id = p.id
       WHERE mr.id = $1`,
      [id]
    );

    if (mrResult.rows.length === 0) {
      throw new AppError('Maintenance request not found', 404);
    }

    const maintenanceRequest = mrResult.rows[0];

    // Verify authorization (owner can only update their own property requests)
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || maintenanceRequest.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
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

    if (status === 'completed') {
      paramCount++;
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE maintenance_requests SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Maintenance request updated successfully',
    });

    const tenantInfoResult = await query(
      `SELECT t.full_name, u.email
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [maintenanceRequest.tenant_id]
    );

    const propertyInfoResult = await query(
      `SELECT property_name FROM properties WHERE id = $1`,
      [maintenanceRequest.property_id]
    );

    const tenantInfo = tenantInfoResult.rows[0] ?? {};
    const tenantEmail = tenantInfo.email;
    const tenantName = tenantInfo.full_name || tenantEmail || 'Customer';
    const propertyName = propertyInfoResult.rows[0]?.property_name || 'Your property';

    if (tenantEmail) {
      const statusLabel = status
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      emailService
        .sendTemplate('maintenance.request.statusUpdated', {
          to: { address: tenantEmail, name: tenantName },
          context: {
            tenantName,
            tenantEmail,
            propertyName,
            status: statusLabel,
            assignedTo: assignedTo || maintenanceRequest.assigned_to || null,
            updatedBy: req.user.email || 'Property UAE',
            reviewNotes: null,
          },
        })
        .catch((emailError) => {
          console.error('Failed to send maintenance status update email:', emailError);
        });
    }
  } catch (error) {
    next(error);
  }
};

// Get Tenant Maintenance Requests
export const getMaintenanceRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    let whereClause = 'WHERE mr.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND mr.status = $${paramCount}`;
      params.push(status);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND mr.type = $${paramCount}`;
      params.push(type);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT mr.*, p.property_name, p.address as property_address
       FROM maintenance_requests mr
       JOIN properties p ON mr.property_id = p.id
       ${whereClause}
       ORDER BY mr.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    // Get photos for each request
    for (const request of result.rows) {
      const photosResult = await query(
        'SELECT photo_url FROM maintenance_request_photos WHERE maintenance_request_id = $1',
        [request.id]
      );
      request.photos = photosResult.rows.map((r) => r.photo_url);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM maintenance_requests mr ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        maintenanceRequests: result.rows,
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

// Create Maintenance Request
export const createMaintenanceRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { propertyId, leaseId, type, category, description, photos } = req.body;

    // Validation
    if (!propertyId || !type || !description) {
      throw new AppError('Property ID, type, and description are required', 400);
    }

    if (!['urgent', 'routine', 'emergency'].includes(type)) {
      throw new AppError('Invalid maintenance type', 400);
    }

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    // Verify property exists and tenant has access
    const propertyResult = await query(
      `SELECT p.*,
              o.id AS owner_id,
              u.email AS owner_email,
              CONCAT(o.first_name, ' ', o.last_name) AS owner_full_name,
              COALESCE(o.company_name, CONCAT(o.first_name, ' ', o.last_name)) AS owner_display_name
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE p.id = $1`,
      [propertyId]
    );
    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    // Create maintenance request
    const { v4: uuidv4 } = await import('uuid');
    const requestId = uuidv4();

    await query(
      `INSERT INTO maintenance_requests (id, property_id, tenant_id, lease_id, type, category, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [requestId, propertyId, tenantId, leaseId || null, type, category || null, description, 'pending']
    );

    // Save photos if provided
    if (photos && Array.isArray(photos) && photos.length > 0) {
      for (const photoUrl of photos) {
        await query(
          'INSERT INTO maintenance_request_photos (maintenance_request_id, photo_url) VALUES ($1, $2)',
          [requestId, photoUrl]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Maintenance request created successfully',
      data: {
        requestId,
      },
    });

    const property = propertyResult.rows[0];
    const tenantProfileResult = await query(
      `SELECT t.full_name, u.email
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [tenantId]
    );

    const tenantProfile = tenantProfileResult.rows[0] ?? {};
    const tenantName = tenantProfile.full_name || req.user.email || 'Tenant';

    if (property.owner_email) {
      const submittedAt = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      emailService
        .sendTemplate('maintenance.request.submitted', {
          to: {
            address: property.owner_email,
            name: property.owner_display_name || property.owner_full_name || property.owner_email,
          },
          context: {
            ownerName: property.owner_display_name || property.owner_full_name || 'Property Owner',
            ownerEmail: property.owner_email,
            tenantName,
            propertyName: property.property_name || 'Your property',
            category: category || 'General',
            type,
            description,
            submittedAt,
          },
        })
        .catch((emailError) => {
          console.error('Failed to send maintenance request notification email:', emailError);
        });
    }
  } catch (error) {
    next(error);
  }
};

// Get Tenant Notifications
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [req.user.id];
    let paramCount = 1;

    if (unreadOnly === 'true') {
      paramCount++;
      whereClause += ` AND read_at IS NULL`;
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        notifications: result.rows,
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
