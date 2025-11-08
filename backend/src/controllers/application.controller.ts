import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query, pool } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { notifications } from '../services/email/notifications';

export const createApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { propertyId, applicantInfo, employmentDetails, moveInDate, viewingDate, viewingTime, ejariRequired, documents, offerAmount } = req.body;

    // Validation
    if (!propertyId || !applicantInfo) {
      throw new AppError('Property ID and applicant information are required', 400);
    }

    // Get tenant_id from user
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }

    const tenantId = tenantResult.rows[0].id;

    // Get tenant profile to check for required fields when applying for property
    const tenantProfileResult = await query(
      'SELECT emirates_id, passport_number FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (tenantProfileResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    
    const tenantProfile = tenantProfileResult.rows[0];
    
    // When applying for a property (renting), Emirates ID and passport are required
    // This is different from registration - registration is just account creation
    if (!tenantProfile.emirates_id || tenantProfile.emirates_id.trim() === '') {
      throw new AppError('Emirates ID is required to apply for a property. Please update your profile with your Emirates ID first.', 400);
    }
    
    if (!tenantProfile.passport_number || tenantProfile.passport_number.trim() === '') {
      throw new AppError('Passport number is required to apply for a property. Please update your profile with your passport number first.', 400);
    }

    // Verify property exists
    const propertyResult = await query(
      `SELECT p.*,
              o.id as owner_id,
              o.first_name,
              o.last_name,
              o.company_name,
              u.email as owner_email,
              u.mobile as owner_mobile
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE p.id = $1`,
      [propertyId]
    );

    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const property = propertyResult.rows[0];

    const tenantInfoResult = await query(
      `SELECT t.full_name, u.email, u.mobile
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [tenantId]
    );
    const tenantInfo = tenantInfoResult.rows[0] || {};

    // Check if property is already occupied (has active lease)
    if (property.status === 'occupied') {
      throw new AppError('Property is already leased and not accepting new applications', 400);
    }

    // Check if tenant has already applied for this property
    const existingApplication = await query(
      `SELECT id, status FROM applications 
       WHERE property_id = $1 AND tenant_id = $2 
       ORDER BY created_at DESC
       LIMIT 1`,
      [propertyId, tenantId]
    );

    if (existingApplication.rows.length > 0) {
      const existingApp = existingApplication.rows[0];

      if (['pending', 'under_review'].includes(existingApp.status)) {
        throw new AppError('You have already applied for this property', 400);
      }

      if (existingApp.status === 'approved') {
        // If the property is still occupied, prevent new application
        if (property.status === 'occupied') {
          throw new AppError('You have already been approved for this property', 400);
        }

        // If property is now vacant/unlocked, cancel previous approval to allow reapplication
        await query(
          `UPDATE applications 
           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP, rejection_reason = COALESCE(rejection_reason, 'Superseded by new application')
           WHERE id = $1`,
          [existingApp.id]
        );
      }
    }

    // Auto-associate tenant with property owner if not already associated
    await query(
      'UPDATE tenants SET owner_id = $1 WHERE id = $2 AND owner_id IS NULL',
      [property.owner_id, tenantId]
    );

    // Create application
    const applicationId = uuidv4();
    await query(
      `INSERT INTO applications (
        id, property_id, tenant_id, applicant_info, employment_details, 
        move_in_date, viewing_date, viewing_time, ejari_required, status, offer_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        applicationId,
        propertyId,
        tenantId,
        JSON.stringify(applicantInfo),
        employmentDetails ? JSON.stringify(employmentDetails) : null,
        moveInDate || null,
        viewingDate || null,
        viewingTime || null,
        ejariRequired || false,
        'pending',
        offerAmount ? parseFloat(offerAmount) : null,
      ]
    );

    // Save documents if provided
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        await query(
          `INSERT INTO application_documents (application_id, document_type, document_url, file_name, file_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [applicationId, doc.type, doc.url, doc.fileName, doc.fileSize]
        );
      }
    }

    await notifications.applicationSubmittedOwner({
      ownerEmail: property.owner_email,
      ownerName: property.company_name || `${property.first_name || ''} ${property.last_name || ''}`.trim() || null,
      tenantName: tenantInfo.full_name || req.user.email || 'Prospective tenant',
      propertyName: property.property_name || null,
      offerAmount: offerAmount ? Number(offerAmount) : null,
      submittedAt: new Date(),
      applicantEmail: tenantInfo.email || req.user.email || null,
      applicantMobile: tenantInfo.mobile || req.user.mobile || null,
    });

    await notifications.applicationSubmittedTenant({
      tenantEmail: tenantInfo.email || req.user.email || null,
      tenantName: tenantInfo.full_name || null,
      propertyName: property.property_name || null,
    });

    res.status(201).json({
      success: true,
      message: 'Application created successfully',
      data: {
        applicationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Applications (for tenant or owner)
export const getApplications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    // If tenant, show their applications
    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }
      whereClause = 'WHERE a.tenant_id = $1';
      params.push(tenantResult.rows[0].id);
      paramCount = 1;
    } 
    // If owner, show applications for their properties
    else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0) {
        throw new AppError('Owner profile not found', 404);
      }
      whereClause = 'WHERE p.owner_id = $1';
      params.push(ownerResult.rows[0].id);
      paramCount = 1;
    } else {
      throw new AppError('Unauthorized', 403);
    }

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
       t.full_name as tenant_name, u.email, u.mobile, t.user_id as tenant_user_id,
       t.nationality, t.employment_status, t.emirates_id,
       o.company_name as owner_company, o.user_id as owner_user_id
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       JOIN tenants t ON a.tenant_id = t.id
       JOIN users u ON t.user_id = u.id
       JOIN owners o ON p.owner_id = o.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    // Get documents for each application
    for (const app of result.rows) {
      const docsResult = await query(
        'SELECT * FROM application_documents WHERE application_id = $1',
        [app.id]
      );
      app.documents = docsResult.rows;

      if (app.emirates_id) {
        const value = String(app.emirates_id);
        const masked = value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : value;
        app.emirates_id_masked = masked;
        if (req.user.userType === 'owner') {
          delete app.emirates_id;
        }
      }
    }

    result.rows.forEach((app: any) => {
      if (app.applicant_info && typeof app.applicant_info === 'string') {
        try {
          app.applicant_info = JSON.parse(app.applicant_info);
        } catch (error) {
          // ignore
        }
      }
      if (app.employment_details && typeof app.employment_details === 'string') {
        try {
          app.employment_details = JSON.parse(app.employment_details);
        } catch (error) {
          // ignore
        }
      }
      if (app.property_address && typeof app.property_address === 'string') {
        try {
          app.property_address = JSON.parse(app.property_address);
        } catch (error) {
          // ignore
        }
      }
    });

    const countResult = await query(
      `SELECT COUNT(*) FROM applications a
       ${req.user.userType === 'owner' ? 'JOIN properties p ON a.property_id = p.id' : ''}
       ${whereClause}`,
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

// Get Application by ID
export const getApplicationById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    const result = await query(
      `SELECT a.*, p.property_name, p.address as property_address, p.price, p.owner_id,
       t.full_name as tenant_name, u.email, u.mobile,
       o.company_name as owner_company
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       JOIN tenants t ON a.tenant_id = t.id
       JOIN users u ON t.user_id = u.id
       JOIN owners o ON p.owner_id = o.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Application not found', 404);
    }

    const application = result.rows[0];

    // Check authorization
    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0 || application.tenant_id !== tenantResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || application.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Get documents
    const docsResult = await query(
      'SELECT * FROM application_documents WHERE application_id = $1',
      [id]
    );
    application.documents = docsResult.rows;

    res.json({
      success: true,
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Application (tenant can update their application)
export const updateApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'tenant') {
      throw new AppError('Only tenants can update their applications', 403);
    }

    const { id } = req.params;
    const { applicantInfo, employmentDetails, moveInDate, viewingDate, viewingTime, ejariRequired, documents } = req.body;

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }
    const tenantId = tenantResult.rows[0].id;

    // Verify application belongs to tenant
    const appResult = await query('SELECT * FROM applications WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (appResult.rows.length === 0) {
      throw new AppError('Application not found or unauthorized', 404);
    }

    if (appResult.rows[0].status !== 'pending' && appResult.rows[0].status !== 'under_review') {
      throw new AppError('Can only update pending or under review applications', 400);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (applicantInfo !== undefined) {
      paramCount++;
      updates.push(`applicant_info = $${paramCount}`);
      params.push(JSON.stringify(applicantInfo));
    }
    if (employmentDetails !== undefined) {
      paramCount++;
      updates.push(`employment_details = $${paramCount}`);
      params.push(JSON.stringify(employmentDetails));
    }
    if (moveInDate !== undefined) {
      paramCount++;
      updates.push(`move_in_date = $${paramCount}`);
      params.push(moveInDate);
    }
    if (viewingDate !== undefined) {
      paramCount++;
      updates.push(`viewing_date = $${paramCount}`);
      params.push(viewingDate);
    }
    if (viewingTime !== undefined) {
      paramCount++;
      updates.push(`viewing_time = $${paramCount}`);
      params.push(viewingTime);
    }
    if (ejariRequired !== undefined) {
      paramCount++;
      updates.push(`ejari_required = $${paramCount}`);
      params.push(ejariRequired);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE applications SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    // Update documents if provided
    if (documents && Array.isArray(documents)) {
      // Delete old documents
      await query('DELETE FROM application_documents WHERE application_id = $1', [id]);
      // Insert new documents
      for (const doc of documents) {
        await query(
          `INSERT INTO application_documents (application_id, document_type, document_url, file_name, file_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, doc.type, doc.url, doc.fileName, doc.fileSize]
        );
      }
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update Application Status (Owner can approve/reject)
export const updateApplicationStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const client = await pool.connect();
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can update application status', 403);
    }

    const { id } = req.params;
    const { status, rejectionReason, backgroundCheckStatus, leaseStartDate, leaseEndDate } = req.body;

    if (!status || !['pending', 'under_review', 'approved', 'rejected'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    await client.query('BEGIN');

    const appResult = await client.query(
      `SELECT a.*, 
        p.owner_id, p.id as property_id, p.status as property_status, p.price as property_price, p.current_lease_id, p.property_name,
        t.user_id as tenant_user_id, t.full_name as tenant_full_name,
        tu.email as tenant_email, tu.mobile as tenant_mobile,
        o.first_name as owner_first_name, o.last_name as owner_last_name, o.company_name as owner_company,
        ou.email as owner_email, ou.mobile as owner_mobile
       FROM applications a
       JOIN properties p ON a.property_id = p.id
       JOIN tenants t ON a.tenant_id = t.id
       JOIN users tu ON t.user_id = tu.id
       JOIN owners o ON p.owner_id = o.id
       JOIN users ou ON o.user_id = ou.id
       WHERE a.id = $1 FOR UPDATE`,
      [id]
    );

    if (appResult.rows.length === 0) {
      throw new AppError('Application not found', 404);
    }

    const application = appResult.rows[0];

    if (req.user.userType === 'owner') {
      const ownerResult = await client.query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || application.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    const updates: string[] = [`status = $1`, `reviewed_by = $2`, `reviewed_at = CURRENT_TIMESTAMP`];
    const params: any[] = [status, req.user.id];
    let paramCount = 2;

    if (rejectionReason !== undefined) {
      paramCount++;
      updates.push(`rejection_reason = $${paramCount}`);
      params.push(rejectionReason);
    }

    if (backgroundCheckStatus !== undefined) {
      paramCount++;
      updates.push(`background_check_status = $${paramCount}`);
      params.push(backgroundCheckStatus);
    }

    paramCount++;
    params.push(id);

    await client.query(
      `UPDATE applications SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    let createdLeaseStart: Date | null = null;
    let createdLeaseEnd: Date | null = null;
    let createdLeaseRent: number | null = null;

    if (status === 'approved') {
      const existingLease = await client.query(
        `SELECT id FROM leases WHERE property_id = $1 AND status = 'active'`,
        [application.property_id]
      );

      if (existingLease.rows.length > 0) {
        await client.query(
          `UPDATE leases SET status = 'terminated', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [existingLease.rows[0].id]
        );
      }

      const startDate = leaseStartDate
        ? new Date(leaseStartDate)
        : application.move_in_date
        ? new Date(application.move_in_date)
        : new Date();
      if (isNaN(startDate.getTime())) {
        throw new AppError('Invalid lease start date', 400);
      }
      const endDate = leaseEndDate
        ? new Date(leaseEndDate)
        : new Date(startDate.getTime());
      if (!leaseEndDate) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      if (isNaN(endDate.getTime())) {
        throw new AppError('Invalid lease end date', 400);
      }

      const rentAmount = application.offer_amount || application.property_price || 0;
      const securityDeposit = rentAmount;
      createdLeaseRent = rentAmount;

      const leaseResult = await client.query(
        `INSERT INTO leases (
          application_id, property_id, tenant_id, owner_id,
          start_date, end_date, rent_amount, security_deposit, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          id,
          application.property_id,
          application.tenant_id,
          application.owner_id,
          startDate,
          endDate,
          rentAmount,
          securityDeposit,
          'active',
        ]
      );

      const leaseId = leaseResult.rows[0].id;

      await client.query(
        `UPDATE properties SET status = 'occupied', current_lease_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [leaseId, application.property_id]
      );

      await client.query(
        `UPDATE applications SET status = 'rejected', rejection_reason = COALESCE(rejection_reason, 'Lease awarded to another tenant'), updated_at = CURRENT_TIMESTAMP
         WHERE property_id = $1 AND id <> $2 AND status IN ('pending', 'under_review')`,
        [application.property_id, id]
      );

      createdLeaseStart = startDate;
      createdLeaseEnd = endDate;
    }

    await client.query('COMMIT');

    const propertyName = application.property_name || 'the property';
    const tenantEmail = application.tenant_email || null;
    const tenantName = application.tenant_full_name || tenantEmail || 'Tenant';
    const ownerEmail = application.owner_email || null;
    const ownerName =
      application.owner_company ||
      `${application.owner_first_name || ''} ${application.owner_last_name || ''}`.trim() ||
      ownerEmail ||
      'Owner';
    const statusLabel = status.replace(/_/g, ' ');

    await notifications.applicationStatusUpdated({
      email: tenantEmail,
      name: tenantName,
      propertyName,
      status: statusLabel,
      message:
        status === 'approved'
          ? 'Great news! Your application has been approved.'
          : status === 'under_review'
          ? 'Your application is currently under review. We will update you soon.'
          : status === 'pending'
          ? 'Your application has been moved back to pending status.'
          : null,
      rejectionReason: status === 'rejected' ? rejectionReason || null : null,
      leaseStartDate: createdLeaseStart,
      leaseEndDate: createdLeaseEnd,
      rentAmount: createdLeaseRent,
      forTenant: true,
    });

    if (status === 'approved') {
      await notifications.applicationStatusUpdated({
        email: ownerEmail,
        name: ownerName,
        propertyName,
        status: statusLabel,
        message: `${tenantName} has been approved. A lease has been generated automatically.`,
        forTenant: false,
      });

      await notifications.leaseNotification({
        recipientEmail: tenantEmail,
        recipientName: tenantName,
        propertyName,
        action: 'created',
        startDate: createdLeaseStart || undefined,
        endDate: createdLeaseEnd || undefined,
        rentAmount: createdLeaseRent,
      });

      await notifications.leaseNotification({
        recipientEmail: ownerEmail,
        recipientName: ownerName,
        propertyName,
        action: 'created',
        startDate: createdLeaseStart || undefined,
        endDate: createdLeaseEnd || undefined,
        rentAmount: createdLeaseRent,
      });
    }

    res.json({
      success: true,
      message: 'Application status updated successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Cancel Application (Tenant can cancel their application)
export const cancelApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id } = req.params;

    let applicationDetails: any = null;

    if (req.user.userType === 'tenant') {
      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }

      const appResult = await query(
        `SELECT a.*, 
                p.property_name,
                o.first_name as owner_first_name,
                o.last_name as owner_last_name,
                o.company_name as owner_company,
                ou.email as owner_email,
                t.full_name as tenant_full_name
         FROM applications a
         JOIN properties p ON a.property_id = p.id
         JOIN owners o ON p.owner_id = o.id
         JOIN users ou ON o.user_id = ou.id
         JOIN tenants t ON a.tenant_id = t.id
         WHERE a.id = $1 AND a.tenant_id = $2`,
        [id, tenantResult.rows[0].id]
      );
      if (appResult.rows.length === 0) {
        throw new AppError('Application not found or unauthorized', 404);
      }

      applicationDetails = appResult.rows[0];

      if (appResult.rows[0].status === 'approved') {
        throw new AppError('Cannot cancel an approved application', 400);
      }
    } else if (req.user.userType === 'admin') {
      const appResult = await query(
        `SELECT a.*, 
                p.property_name,
                o.first_name as owner_first_name,
                o.last_name as owner_last_name,
                o.company_name as owner_company,
                ou.email as owner_email,
                t.full_name as tenant_full_name
         FROM applications a
         JOIN properties p ON a.property_id = p.id
         JOIN owners o ON p.owner_id = o.id
         JOIN users ou ON o.user_id = ou.id
         JOIN tenants t ON a.tenant_id = t.id
         WHERE a.id = $1`,
        [id]
      );
      if (appResult.rows.length === 0) {
        throw new AppError('Application not found', 404);
      }
      applicationDetails = appResult.rows[0];
    } else {
      throw new AppError('Unauthorized', 403);
    }

    await query('UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      'cancelled',
      id,
    ]);

    if (applicationDetails?.owner_email) {
      const ownerName =
        applicationDetails.owner_company ||
        `${applicationDetails.owner_first_name || ''} ${applicationDetails.owner_last_name || ''}`.trim() ||
        applicationDetails.owner_email;
      await notifications.applicationStatusUpdated({
        email: applicationDetails.owner_email,
        name: ownerName,
        propertyName: applicationDetails.property_name || 'the property',
        status: 'cancelled',
        message: `${applicationDetails.tenant_full_name || 'The tenant'} cancelled their application.`,
        forTenant: false,
      });
    }

    res.json({
      success: true,
      message: 'Application cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

