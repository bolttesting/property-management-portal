import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { pool, query } from '../database/connection';
import { emailService } from '../services/email/email.service';

const REQUIRED_DOCUMENT_FIELDS = [
  'emiratesIdFrontUrl',
  'emiratesIdBackUrl',
  'passportCopyUrl',
  'visaPageUrl',
  'tenancyContractUrl',
  'landlordNocUrl',
];

const ALLOWED_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
  'completed',
];

const OWNER_REVIEW_STATUS = ['approved', 'rejected', 'under_review', 'completed'];

const deserialize = (value: any) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const serialize = (value: any) => {
  if (!value) return '[]';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const normalizePermitRow = (permit: any) => {
  if (!permit) return permit;

  if (permit.vehicle_details && typeof permit.vehicle_details === 'string') {
    try {
      permit.vehicle_details = JSON.parse(permit.vehicle_details);
    } catch {
      permit.vehicle_details = [];
    }
  }

  if (permit.additional_documents && typeof permit.additional_documents === 'string') {
    try {
      permit.additional_documents = JSON.parse(permit.additional_documents);
    } catch {
      permit.additional_documents = [];
    }
  }

  if (permit.property_address && typeof permit.property_address === 'string') {
    try {
      permit.property_address = JSON.parse(permit.property_address);
    } catch {
      // keep raw string
    }
  }

  return permit;
};

async function getTenantId(userId: string) {
  const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [userId]);
  if (tenantResult.rows.length === 0) {
    throw new AppError('Tenant profile not found', 404);
  }
  return tenantResult.rows[0].id;
}

async function getOwnerId(userId: string) {
  const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [userId]);
  if (ownerResult.rows.length === 0) {
    throw new AppError('Owner profile not found', 404);
  }
  return ownerResult.rows[0].id;
}

export const createTenantMovePermit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.userType !== 'tenant') {
      throw new AppError('Only tenants can submit move permits', 403);
    }

    const tenantId = await getTenantId(req.user.id);
    const {
      propertyId,
      permitType,
      requestedMoveDate,
      timeWindowStart,
      timeWindowEnd,
      emiratesIdFrontUrl,
      emiratesIdBackUrl,
      passportCopyUrl,
      visaPageUrl,
      tenancyContractUrl,
      ejariCertificateUrl,
      landlordNocUrl,
      moversCompanyName,
      moversTradeLicenseUrl,
      moversNocUrl,
      moversContactName,
      moversContactMobile,
      vehicleDetails,
      additionalDocuments,
      specialInstructions,
    } = req.body;

    if (!propertyId || !permitType || !requestedMoveDate) {
      throw new AppError('Property, permit type, and requested move date are required', 400);
    }

    if (!['move_in', 'move_out'].includes(permitType)) {
      throw new AppError('Permit type must be move_in or move_out', 400);
    }

    for (const field of REQUIRED_DOCUMENT_FIELDS) {
      if (!req.body[field]) {
        throw new AppError(`Missing required document: ${field}`, 400);
      }
    }

    if (!moversCompanyName || !moversTradeLicenseUrl || !moversNocUrl) {
      throw new AppError('Moving company details and NOC are required', 400);
    }

    if (!moversContactName || !moversContactMobile) {
      throw new AppError('Moving company contact details are required', 400);
    }

    const vehicleArray = deserialize(vehicleDetails);
    if (!vehicleArray || vehicleArray.length === 0) {
      throw new AppError('At least one vehicle detail is required', 400);
    }

    const propertyResult = await query(
      `SELECT p.id,
              p.owner_id,
              p.property_name,
              l.id as lease_id,
              COALESCE(o.company_name, CONCAT(o.first_name, ' ', o.last_name)) AS owner_display_name,
              CONCAT(o.first_name, ' ', o.last_name) AS owner_full_name,
              u.email AS owner_email
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       JOIN users u ON o.user_id = u.id
       LEFT JOIN leases l ON l.property_id = p.id AND l.tenant_id = $1 AND l.status = 'active'
       WHERE p.id = $2`,
      [tenantId, propertyId]
    );

    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const property = propertyResult.rows[0];
    if (!property.lease_id) {
      throw new AppError('Move permits can only be requested for properties with an active lease', 400);
    }

    const permitId = uuidv4();

    await query(
      `INSERT INTO move_permits (
        id, tenant_id, property_id, permit_type, status,
        requested_move_date, time_window_start, time_window_end,
        emirates_id_front_url, emirates_id_back_url, passport_copy_url, visa_page_url,
        tenancy_contract_url, ejari_certificate_url, landlord_noc_url,
        movers_company_name, movers_trade_license_url, movers_noc_url,
        movers_contact_name, movers_contact_mobile,
        vehicle_details, additional_documents, special_instructions,
        submitted_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'submitted',
        $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19,
        $20, $21, $22,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      [
        permitId,
        tenantId,
        propertyId,
        permitType,
        requestedMoveDate,
        timeWindowStart || null,
        timeWindowEnd || null,
        emiratesIdFrontUrl,
        emiratesIdBackUrl,
        passportCopyUrl,
        visaPageUrl,
        tenancyContractUrl,
        ejariCertificateUrl || null,
        landlordNocUrl,
        moversCompanyName,
        moversTradeLicenseUrl,
        moversNocUrl,
        moversContactName,
        moversContactMobile,
        serialize(vehicleArray),
        serialize(additionalDocuments),
        specialInstructions || null,
      ]
    );

    const createdPermit = await query('SELECT * FROM move_permits WHERE id = $1', [permitId]);

    res.status(201).json({
      success: true,
      message: 'Move permit submitted successfully',
      data: {
        permit: normalizePermitRow(createdPermit.rows[0]),
      },
    });

    const propertyInfo = propertyResult.rows[0];
    const tenantProfileResult = await query(
      `SELECT t.full_name, u.email
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [tenantId]
    );
    const tenantProfile = tenantProfileResult.rows[0] ?? {};
    const tenantName = tenantProfile.full_name || req.user.email || 'Tenant';

    if (propertyInfo.owner_email) {
      const requestedDateFormatted = new Date(requestedMoveDate).toLocaleDateString('en-GB', {
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });

      const timeWindow = timeWindowStart && timeWindowEnd ? `${timeWindowStart} - ${timeWindowEnd}` : null;
      const permitTypeLabel =
        permitType === 'move_in'
          ? 'Move-in'
          : permitType === 'move_out'
          ? 'Move-out'
          : permitType;

      emailService
        .sendTemplate('movePermit.submitted', {
          to: {
            address: propertyInfo.owner_email,
            name: propertyInfo.owner_display_name || propertyInfo.owner_full_name || propertyInfo.owner_email,
          },
          context: {
            ownerName: propertyInfo.owner_display_name || propertyInfo.owner_full_name || 'Property Owner',
            ownerEmail: propertyInfo.owner_email,
            tenantName,
            propertyName: propertyInfo.property_name || 'Your property',
            permitType: permitTypeLabel,
            requestedDate: requestedDateFormatted,
            timeWindow,
          },
        })
        .catch((emailError) => {
          console.error('Failed to send move permit submitted email:', emailError);
        });
    }
  } catch (error) {
    next(error);
  }
};

export const getTenantMovePermits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const tenantId = await getTenantId(req.user.id);
    const { status, permitType, page = 1, limit = 20 } = req.query;

    let whereClause = 'WHERE mp.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND mp.status = $${paramCount}`;
      params.push(status);
    }

    if (permitType) {
      paramCount++;
      whereClause += ` AND mp.permit_type = $${paramCount}`;
      params.push(permitType);
    }

    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT mp.*, p.property_name, p.address as property_address
       FROM move_permits mp
       JOIN properties p ON mp.property_id = p.id
       ${whereClause}
       ORDER BY mp.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM move_permits mp ${whereClause}`,
      params.slice(0, -2)
    );

    const permits = result.rows.map(normalizePermitRow);

    res.json({
      success: true,
      data: {
        permits,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count, 10),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantMovePermitById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const tenantId = await getTenantId(req.user.id);
    const { id } = req.params;

    const result = await query(
      `SELECT mp.*, p.property_name, p.address as property_address
       FROM move_permits mp
       JOIN properties p ON mp.property_id = p.id
       WHERE mp.id = $1 AND mp.tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Move permit not found', 404);
    }

    res.json({
      success: true,
      data: {
        permit: normalizePermitRow(result.rows[0]),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelTenantMovePermit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const tenantId = await getTenantId(req.user.id);
    const { id } = req.params;

    await client.query('BEGIN');
    const permitResult = await client.query(
      `SELECT * FROM move_permits WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [id, tenantId]
    );

    if (permitResult.rows.length === 0) {
      throw new AppError('Move permit not found', 404);
    }

    const permit = permitResult.rows[0];
    if (!['submitted', 'under_review'].includes(permit.status)) {
      throw new AppError('Only submitted or under review permits can be cancelled', 400);
    }

    await client.query(
      `UPDATE move_permits
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Move permit cancelled successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getOwnerMovePermits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.userType !== 'owner') {
      throw new AppError('Only owners can access this resource', 403);
    }

    const ownerId = await getOwnerId(req.user.id);
    const { status, permitType, page = 1, limit = 20 } = req.query;

    let whereClause = 'WHERE p.owner_id = $1';
    const params: any[] = [ownerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND mp.status = $${paramCount}`;
      params.push(status);
    }

    if (permitType) {
      paramCount++;
      whereClause += ` AND mp.permit_type = $${paramCount}`;
      params.push(permitType);
    }

    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT mp.*, p.property_name, p.address as property_address,
              t.full_name as tenant_name, u.email as tenant_email, u.mobile as tenant_mobile
       FROM move_permits mp
       JOIN properties p ON mp.property_id = p.id
       JOIN tenants t ON mp.tenant_id = t.id
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY mp.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM move_permits mp
       JOIN properties p ON mp.property_id = p.id
       ${whereClause}`,
      params.slice(0, -2)
    );

    const permits = result.rows.map(normalizePermitRow);

    res.json({
      success: true,
      data: {
        permits,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count, 10),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateOwnerMovePermitStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (!['owner', 'admin'].includes(req.user.userType)) {
      throw new AppError('Only owners or admins can update move permits', 403);
    }

    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      throw new AppError('Invalid status value', 400);
    }

    if (req.user.userType === 'owner' && !OWNER_REVIEW_STATUS.includes(status)) {
      throw new AppError('Owners can only set status to under_review, approved, rejected, or completed', 403);
    }

    await client.query('BEGIN');

    const permitResult = await client.query(
      `SELECT mp.*, p.owner_id FROM move_permits mp
       JOIN properties p ON mp.property_id = p.id
       WHERE mp.id = $1 FOR UPDATE`,
      [id]
    );

    if (permitResult.rows.length === 0) {
      throw new AppError('Move permit not found', 404);
    }

    const permit = permitResult.rows[0];

    if (req.user.userType === 'owner') {
      const ownerId = await getOwnerId(req.user.id);
      if (permit.owner_id !== ownerId) {
        throw new AppError('Unauthorized', 403);
      }
    }

    await client.query(
      `UPDATE move_permits
       SET status = $1,
           review_notes = $2,
           reviewer_user_id = $3,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, reviewNotes || null, req.user.id, id]
    );

    await client.query('COMMIT');

    const tenantProfileResult = await query(
      `SELECT t.full_name, u.email
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [permit.tenant_id]
    );

    const propertyInfoResult = await query(
      `SELECT property_name FROM properties WHERE id = $1`,
      [permit.property_id]
    );

    const tenantProfile = tenantProfileResult.rows[0] ?? {};
    const tenantEmail = tenantProfile.email;
    const tenantName = tenantProfile.full_name || tenantEmail || 'Tenant';
    const propertyName = propertyInfoResult.rows[0]?.property_name || 'Your property';
    const permitTypeLabel =
      permit.permit_type === 'move_in'
        ? 'Move-in'
        : permit.permit_type === 'move_out'
        ? 'Move-out'
        : permit.permit_type;

    if (tenantEmail) {
      const statusLabel = status
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const reviewedAt = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      emailService
        .sendTemplate('movePermit.statusUpdated', {
          to: { address: tenantEmail, name: tenantName },
          context: {
            tenantName,
            tenantEmail,
            propertyName,
            permitType: permitTypeLabel,
            status: statusLabel,
            reviewNotes: reviewNotes || permit.review_notes || null,
            reviewedAt,
            updatedBy: req.user.email || 'Property UAE',
          },
        })
        .catch((emailError) => {
          console.error('Failed to send move permit status email:', emailError);
        });
    }

    res.json({
      success: true,
      message: 'Move permit status updated successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

