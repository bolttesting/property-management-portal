import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query, pool } from '../database/connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Get Owner Dashboard (Property Dealer Dashboard)
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Get owner_id
    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      console.error(`Owner profile not found for user_id: ${req.user.id}`);
      throw new AppError('Owner profile not found. Please complete your owner registration.', 404);
    }

    const ownerId = ownerResult.rows[0].id;

    // Get statistics
    const stats = await Promise.all([
      // Total properties
      query('SELECT COUNT(*) FROM properties WHERE owner_id = $1', [ownerId]),
      // Occupied properties
      query("SELECT COUNT(*) FROM properties WHERE owner_id = $1 AND status = 'occupied'", [ownerId]),
      // Vacant properties
      query("SELECT COUNT(*) FROM properties WHERE owner_id = $1 AND status = 'vacant'", [ownerId]),
      // Total tenants
      query('SELECT COUNT(*) FROM tenants WHERE owner_id = $1', [ownerId]),
      // Pending applications
      query(
        `SELECT COUNT(*) FROM applications a
         JOIN properties p ON a.property_id = p.id
         WHERE p.owner_id = $1 AND a.status = 'pending'`,
        [ownerId]
      ),
      // Active leases
      query(
        `SELECT COUNT(*) FROM leases WHERE owner_id = $1 AND status = 'active'`,
        [ownerId]
      ),
      // Pending maintenance requests
      query(
        `SELECT COUNT(*) FROM maintenance_requests mr
         JOIN properties p ON mr.property_id = p.id
         WHERE p.owner_id = $1 AND mr.status = 'pending'`,
        [ownerId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        dashboard: {
          statistics: {
            totalProperties: parseInt(stats[0].rows[0].count),
            occupiedProperties: parseInt(stats[1].rows[0].count),
            vacantProperties: parseInt(stats[2].rows[0].count),
            totalTenants: parseInt(stats[3].rows[0].count),
            pendingApplications: parseInt(stats[4].rows[0].count),
            activeLeases: parseInt(stats[5].rows[0].count),
            pendingMaintenanceRequests: parseInt(stats[6].rows[0].count),
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Owner Profile
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const result = await query(
      `SELECT o.*, u.email, u.mobile, u.status as user_status
       FROM owners o
       JOIN users u ON o.user_id = u.id
       WHERE o.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
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

// Update Owner Profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { firstName, lastName, companyName, contactPerson, serviceAreas } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (firstName) {
      paramCount++;
      updateFields.push(`first_name = $${paramCount}`);
      values.push(firstName);
    }
    if (lastName) {
      paramCount++;
      updateFields.push(`last_name = $${paramCount}`);
      values.push(lastName);
    }
    if (companyName) {
      paramCount++;
      updateFields.push(`company_name = $${paramCount}`);
      values.push(companyName);
    }
    if (contactPerson) {
      paramCount++;
      updateFields.push(`contact_person = $${paramCount}`);
      values.push(JSON.stringify(contactPerson));
    }
    if (serviceAreas) {
      paramCount++;
      updateFields.push(`service_areas = $${paramCount}`);
      values.push(serviceAreas);
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    values.push(req.user.id);

    await query(
      `UPDATE owners SET ${updateFields.join(', ')} WHERE user_id = $${paramCount}`,
      values
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get Properties (with filters: location, status)
export const getProperties = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Get owner_id
    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      console.error(`Owner profile not found for user_id: ${req.user.id}`);
      throw new AppError('Owner profile not found. Please complete your owner registration.', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { location, status, propertyType, category, page = 1, limit = 20 } = req.query;

    let whereClause = 'WHERE p.owner_id = $1';
    const params: any[] = [ownerId];
    let paramCount = 1;

    // Location filter (searches in address->>'location' or address->>'area')
    if (location) {
      paramCount++;
      whereClause += ` AND (p.address->>'location' ILIKE $${paramCount} OR p.address->>'area' ILIKE $${paramCount})`;
      params.push(`%${location}%`);
    }

    // Status filter
    if (status) {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    // Property type filter
    if (propertyType) {
      paramCount++;
      whereClause += ` AND p.property_type = $${paramCount}`;
      params.push(propertyType);
    }

    // Category filter
    if (category) {
      paramCount++;
      whereClause += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    // Get properties with current lease info
    const result = await query(
      `SELECT p.*, 
       l.id as current_lease_id, l.start_date as lease_start_date, l.end_date as lease_end_date,
       t.full_name as current_tenant_name,
       u.email as current_tenant_email,
       u.mobile as current_tenant_mobile,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image
       FROM properties p
       LEFT JOIN leases l ON p.current_lease_id = l.id AND l.status = 'active'
       LEFT JOIN tenants t ON l.tenant_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    // Parse address JSONB for all properties
    result.rows.forEach((property: any) => {
      if (property.address && typeof property.address === 'string') {
        try {
          property.address = JSON.parse(property.address);
        } catch (e) {
          // If parsing fails, keep as is
        }
      }
    });

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM properties p ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        properties: result.rows,
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

// Get Applications (for owner's properties)
export const getApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { status, page = 1, limit = 20, propertyId } = req.query;

    let whereClause = 'WHERE p.owner_id = $1';
    const params: any[] = [ownerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (propertyId) {
      paramCount++;
      whereClause += ` AND l.property_id = $${paramCount}`;
      params.push(propertyId);
    }

    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT a.*, p.property_name, p.address as property_address, p.price as property_price,
       t.full_name as tenant_name, t.nationality, t.employment_status, t.emirates_id,
       u.id as tenant_user_id, u.email, u.mobile
       FROM applications a
       JOIN properties p ON a.property_id = p.id
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

    // Parse JSONB fields for all applications
    result.rows.forEach((app: any) => {
      if (app.applicant_info && typeof app.applicant_info === 'string') {
        try {
          app.applicant_info = JSON.parse(app.applicant_info);
        } catch (e) {
          // If parsing fails, keep as is
        }
      }
      if (app.employment_details && typeof app.employment_details === 'string') {
        try {
          app.employment_details = JSON.parse(app.employment_details);
        } catch (e) {
          // If parsing fails, keep as is
        }
      }
      if (app.property_address && typeof app.property_address === 'string') {
        try {
          app.property_address = JSON.parse(app.property_address);
        } catch (e) {
          // If parsing fails, keep as is
        }
      }

      if (app.emirates_id) {
        const value = String(app.emirates_id);
        const masked = value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : value;
        app.emirates_id_masked = masked;
      }
    });

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

// Get Leases (for owner's properties)
export const getLeases = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { status, page = 1, limit = 20, propertyId } = req.query;

    let whereClause = 'WHERE l.owner_id = $1';
    const params: any[] = [ownerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND l.status = $${paramCount}`;
      params.push(status);
    }

    if (propertyId) {
      paramCount++;
      whereClause += ` AND l.property_id = $${paramCount}`;
      params.push(propertyId);
    }

    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT l.*, p.property_name, p.address as property_address,
       t.full_name as tenant_name, u.email as tenant_email, u.mobile as tenant_mobile
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY l.created_at DESC
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
          // keep raw
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

export const updateLeaseContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can update lease contracts', 403);
    }

    const { id } = req.params;
    const {
      contractUrl,
      chequeCount,
      paymentMethod,
      firstDueDate,
      reminderLeadDays = 3,
    } = req.body;

    if (
      contractUrl === undefined &&
      chequeCount === undefined &&
      paymentMethod === undefined &&
      firstDueDate === undefined
    ) {
      throw new AppError('No updates provided', 400);
    }

    await client.query('BEGIN');

    const leaseResult = await client.query(
      `SELECT l.*, p.owner_id, p.property_name, t.id as tenant_id, t.user_id as tenant_user_id
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       WHERE l.id = $1 FOR UPDATE`,
      [id]
    );

    if (leaseResult.rows.length === 0) {
      throw new AppError('Lease not found', 404);
    }

    const lease = leaseResult.rows[0];

    if (req.user.userType === 'owner') {
      const ownerResult = await client.query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || lease.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (contractUrl !== undefined) {
      paramCount++;
      updates.push(`contract_document_url = $${paramCount}`);
      params.push(contractUrl || null);

      if (contractUrl) {
        updates.push(`contract_uploaded_at = CURRENT_TIMESTAMP`);
        paramCount++;
        updates.push(`contract_uploaded_by = $${paramCount}`);
        params.push(req.user.id);
      } else {
        updates.push(`contract_uploaded_at = NULL`);
        updates.push(`contract_uploaded_by = NULL`);
      }
    }

    if (paymentMethod !== undefined) {
      const allowedMethods = ['cheque', 'bank_transfer', 'cash', 'other'];
      if (!allowedMethods.includes(paymentMethod)) {
        throw new AppError('Invalid payment method', 400);
      }
      paramCount++;
      updates.push(`payment_method = $${paramCount}`);
      params.push(paymentMethod);
    }

    let paymentPlanSummary: Array<{ installment: number; dueDate: string; amount: number }> | null = null;
    let createdPayments: any[] = [];

    if (chequeCount !== undefined) {
      const allowedCounts = [1, 2, 4, 6, 12];
      if (!allowedCounts.includes(Number(chequeCount))) {
        throw new AppError('Cheque count must be 1, 2, 4, or 12', 400);
      }

      const numericChequeCount = Number(chequeCount);
      paramCount++;
      updates.push(`cheque_count = $${paramCount}`);
      params.push(numericChequeCount);

      const rentAmount = Number(lease.rent_amount);
      if (isNaN(rentAmount) || rentAmount <= 0) {
        throw new AppError('Invalid rent amount on lease', 400);
      }

      const startDate = firstDueDate ? new Date(firstDueDate) : new Date(lease.start_date);
      if (isNaN(startDate.getTime())) {
        throw new AppError('Invalid first due date', 400);
      }

      const endDate = new Date(lease.end_date);
      const intervalMonths =
        numericChequeCount === 1
          ? 12
          : numericChequeCount === 2
          ? 6
          : numericChequeCount === 4
          ? 3
          : numericChequeCount === 6
          ? 2
          : 1;

      const baseAmount = Math.floor((rentAmount / numericChequeCount) * 100) / 100;
      const amounts: number[] = Array(numericChequeCount).fill(baseAmount);
      const totalAllocated = baseAmount * numericChequeCount;
      const remainder = Math.round((rentAmount - totalAllocated) * 100) / 100;
      if (remainder !== 0) {
        amounts[amounts.length - 1] = Math.round((amounts[amounts.length - 1] + remainder) * 100) / 100;
      }

      const schedule: Array<{ installment: number; dueDate: Date; amount: number }> = [];
      for (let i = 0; i < numericChequeCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + intervalMonths * i);
        if (dueDate > endDate) {
          // Clamp to lease end date if necessary
          dueDate.setTime(endDate.getTime());
        }
        schedule.push({ installment: i + 1, dueDate, amount: amounts[i] });
      }

      await client.query('DELETE FROM rent_payments WHERE lease_id = $1', [id]);

      paymentPlanSummary = schedule.map((item) => ({
        installment: item.installment,
        dueDate: item.dueDate.toISOString().split('T')[0],
        amount: item.amount,
      }));

      for (const item of schedule) {
        const paymentId = uuidv4();
        const result = await client.query(
          `INSERT INTO rent_payments (
            id, lease_id, tenant_id, property_id, owner_id,
            amount, due_date, payment_method, payment_status,
            installment_number, reminder_lead_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
          RETURNING *`,
          [
            paymentId,
            id,
            lease.tenant_id,
            lease.property_id,
            lease.owner_id,
            item.amount,
            item.dueDate.toISOString().split('T')[0],
            paymentMethod || lease.payment_method || 'cheque',
            item.installment,
            reminderLeadDays,
          ]
        );
        createdPayments.push(result.rows[0]);
      }

      if (paymentPlanSummary) {
        paramCount++;
        updates.push(`payment_plan = $${paramCount}`);
        params.push(JSON.stringify(paymentPlanSummary));
      }
    }

    if (updates.length > 0) {
      paramCount++;
      params.push(id);
      await client.query(
        `UPDATE leases SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
        params
      );
    }

    const updatedLeaseResult = await client.query(
      `SELECT l.*, p.property_name, t.full_name as tenant_name
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       JOIN tenants t ON l.tenant_id = t.id
       WHERE l.id = $1`,
      [id]
    );

    let tenantNotificationMessage = 'Your lease details have been updated.';
    if (paymentPlanSummary && paymentPlanSummary.length > 0) {
      tenantNotificationMessage = `Your rent will be paid in ${paymentPlanSummary.length} cheque(s). First payment due on ${paymentPlanSummary[0].dueDate}.`;
    }

    if (lease.tenant_user_id) {
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type, channels, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          lease.tenant_user_id,
          'Lease updated',
          tenantNotificationMessage,
          'rent_payment',
          ['web', 'email'],
          'pending',
        ]
      );
    }

    await client.query('COMMIT');

    const updatedLease = updatedLeaseResult.rows[0];
    if (updatedLease?.payment_plan && typeof updatedLease.payment_plan === 'string') {
      try {
        updatedLease.payment_plan = JSON.parse(updatedLease.payment_plan);
      } catch {
        // keep original string if parsing fails
      }
    }

    res.json({
      success: true,
      message: 'Lease updated successfully',
      data: {
        lease: updatedLease,
        rentPayments: createdPayments,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Get Financials
export const getFinancials = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { startDate, endDate } = req.query;

    // Get total revenue from active leases
    const revenueResult = await query(
      `SELECT COALESCE(SUM(rent_amount), 0) as total_revenue
       FROM leases
       WHERE owner_id = $1 AND status = 'active'
       ${startDate && endDate ? 'AND start_date >= $2 AND end_date <= $3' : ''}`,
      startDate && endDate ? [ownerId, startDate, endDate] : [ownerId]
    );

    // Get total security deposits
    const depositsResult = await query(
      `SELECT COALESCE(SUM(security_deposit), 0) as total_deposits
       FROM leases
       WHERE owner_id = $1 AND status = 'active'`,
      [ownerId]
    );

    res.json({
      success: true,
      data: {
        financials: {
          totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
          totalSecurityDeposits: parseFloat(depositsResult.rows[0].total_deposits),
          activeLeases: 0, // Can be calculated from leases
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Notifications
export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, Number(limit), offset]
    );

    res.json({
      success: true,
      data: {
        notifications: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create Tenant Account (Property Dealer creates tenant)
export const createTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const {
      email,
      mobile,
      password,
      fullName,
      nationality,
      employmentStatus,
      emiratesId,
      passportNumber,
      visaNumber,
      currentAddress,
      // Employment details
      companyName,
      jobTitle,
      monthlySalary,
      employmentStartDate,
      // Documents (URLs after upload)
      emiratesIdDocument,
      passportDocument,
      visaDocument,
      salaryCertificateDocument,
      bankStatementDocument,
      employmentContractDocument,
    } = req.body;

    // Validation
    if (!email && !mobile) {
      throw new AppError('Email or mobile number is required', 400);
    }
    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }
    if (!fullName) {
      throw new AppError('Full name is required', 400);
    }
    if (!emiratesId) {
      throw new AppError('Emirates ID is required for UAE property rental', 400);
    }
    if (!passportNumber) {
      throw new AppError('Passport number is required', 400);
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR mobile = $2',
      [email || null, mobile || null]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists with this email or mobile', 400);
    }

    // Check if Emirates ID already exists
    if (emiratesId) {
      const existingEmiratesId = await query(
        'SELECT id FROM tenants WHERE emirates_id = $1',
        [emiratesId]
      );
      if (existingEmiratesId.rows.length > 0) {
        throw new AppError('Emirates ID already registered', 400);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, email, mobile, password_hash, user_type, status, email_verified, mobile_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, email || null, mobile || null, passwordHash, 'tenant', 'active', !!email, !!mobile]
    );

    // Create tenant profile (linked to this owner) with all UAE documents
    await query(
      `INSERT INTO tenants (
        user_id, owner_id, full_name, nationality, employment_status, 
        emirates_id, passport_number, visa_number, current_address,
        registration_source, created_by_owner_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        ownerId,
        fullName,
        nationality || null,
        employmentStatus || null,
        emiratesId || null,
        passportNumber || null,
        visaNumber || null,
        currentAddress ? JSON.stringify(currentAddress) : null,
        'created_by_owner',
        ownerId,
      ]
    );

    // Store employment and document details
    // Documents will be stored when tenant applies for a property or can be stored in a separate table

    res.status(201).json({
      success: true,
      message: 'Tenant account created successfully',
      data: {
        userId,
        tenantId: userId, // Can return actual tenant ID if needed
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Tenants (Property Dealer's tenants)
export const getTenants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(
      `SELECT t.id, t.user_id, t.owner_id, t.full_name, t.nationality, t.employment_status, 
              t.emirates_id, t.passport_number, t.visa_number, t.current_address, 
              t.profile_completion, t.registration_source, t.created_at, t.updated_at,
              u.email, u.mobile, u.status as user_status
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.owner_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [ownerId, Number(limit), offset]
    );

    console.log(`Found ${result.rows.length} tenants for owner ${ownerId}`);

    // Parse current_address JSONB if it's a string and ensure ID is present
    result.rows.forEach((tenant: any, index: number) => {
      if (!tenant.id) {
        console.error(`Tenant at index ${index} is missing ID:`, tenant);
      }
      if (tenant.current_address && typeof tenant.current_address === 'string') {
        try {
          tenant.current_address = JSON.parse(tenant.current_address);
        } catch (e) {
          console.warn(`Failed to parse current_address for tenant ${tenant.id}:`, e);
          // If parsing fails, keep as is
        }
      }
    });

    const countResult = await query(
      'SELECT COUNT(*) FROM tenants WHERE owner_id = $1',
      [ownerId]
    );

    res.json({
      success: true,
      data: {
        tenants: result.rows,
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

// Get Tenant by ID (for editing)
export const getTenantById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('getTenantById called with params:', req.params);
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found. Please complete your owner registration.', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { id } = req.params;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    console.log(`Fetching tenant with ID: ${id} for owner: ${ownerId}`);

    const result = await query(
      `SELECT t.id, t.user_id, t.owner_id, t.full_name, t.nationality, t.employment_status,
              t.emirates_id, t.passport_number, t.visa_number, t.current_address,
              t.profile_completion, t.registration_source, t.created_at, t.updated_at,
              u.email, u.mobile, u.status as user_status, u.email_verified, u.mobile_verified
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 AND t.owner_id = $2`,
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      // Check if tenant exists but doesn't belong to this owner
      const tenantCheck = await query('SELECT id FROM tenants WHERE id = $1', [id]);
      if (tenantCheck.rows.length === 0) {
        throw new AppError(`Tenant with ID ${id} not found`, 404);
      } else {
        throw new AppError('You do not have permission to view this tenant', 403);
      }
    }

    const tenant = result.rows[0];
    
    // Parse current_address JSONB if it's a string
    if (tenant.current_address && typeof tenant.current_address === 'string') {
      try {
        tenant.current_address = JSON.parse(tenant.current_address);
      } catch (e) {
        console.warn('Failed to parse current_address for tenant:', id, e);
        tenant.current_address = null;
      }
    }

    console.log(`Successfully fetched tenant: ${tenant.full_name} (ID: ${tenant.id})`);

    res.json({
      success: true,
      data: {
        tenant,
      },
    });
  } catch (error) {
    console.error('Error in getTenantById:', error);
    next(error);
  }
};

// Update Tenant (by owner)
export const updateTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { id } = req.params;
    const {
      fullName,
      email,
      mobile,
      password,
      nationality,
      employmentStatus,
      emiratesId,
      passportNumber,
      visaNumber,
      currentAddress,
      companyName,
      jobTitle,
      monthlySalary,
      employmentStartDate,
      emiratesIdDocument,
      passportDocument,
      visaDocument,
      salaryCertificateDocument,
      bankStatementDocument,
      employmentContractDocument,
    } = req.body;

    // Verify tenant belongs to this owner
    const tenantCheck = await query(
      'SELECT user_id FROM tenants WHERE id = $1 AND owner_id = $2',
      [id, ownerId]
    );

    if (tenantCheck.rows.length === 0) {
      throw new AppError('Tenant not found or unauthorized', 404);
    }

    const userId = tenantCheck.rows[0].user_id;

    // Update user table (email, mobile, password)
    const userUpdates: string[] = [];
    const userParams: any[] = [];
    let userParamCount = 0;

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (emailCheck.rows.length > 0) {
        throw new AppError('Email already in use', 400);
      }
      userParamCount++;
      userUpdates.push(`email = $${userParamCount}`);
      userParams.push(email);
    }

    if (mobile !== undefined) {
      // Check if mobile is already taken by another user
      const mobileCheck = await query(
        'SELECT id FROM users WHERE mobile = $1 AND id != $2',
        [mobile, userId]
      );
      if (mobileCheck.rows.length > 0) {
        throw new AppError('Mobile number already in use', 400);
      }
      userParamCount++;
      userUpdates.push(`mobile = $${userParamCount}`);
      userParams.push(mobile);
    }

    if (password !== undefined && password.length > 0) {
      if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
      }
      const passwordHash = await bcrypt.hash(password, 10);
      userParamCount++;
      userUpdates.push(`password_hash = $${userParamCount}`);
      userParams.push(passwordHash);
    }

    if (userUpdates.length > 0) {
      userParamCount++;
      userParams.push(userId);
      await query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${userParamCount}`,
        userParams
      );
    }

    // Update tenant table
    const tenantUpdates: string[] = [];
    const tenantParams: any[] = [];
    let tenantParamCount = 0;

    if (fullName !== undefined) {
      tenantParamCount++;
      tenantUpdates.push(`full_name = $${tenantParamCount}`);
      tenantParams.push(fullName);
    }
    if (nationality !== undefined) {
      tenantParamCount++;
      tenantUpdates.push(`nationality = $${tenantParamCount}`);
      tenantParams.push(nationality);
    }
    if (employmentStatus !== undefined) {
      tenantParamCount++;
      tenantUpdates.push(`employment_status = $${tenantParamCount}`);
      tenantParams.push(employmentStatus);
    }
    if (emiratesId !== undefined) {
      // Check if Emirates ID is already taken by another tenant
      const emiratesIdCheck = await query(
        'SELECT id FROM tenants WHERE emirates_id = $1 AND id != $2',
        [emiratesId, id]
      );
      if (emiratesIdCheck.rows.length > 0) {
        throw new AppError('Emirates ID already registered', 400);
      }
      tenantParamCount++;
      tenantUpdates.push(`emirates_id = $${tenantParamCount}`);
      tenantParams.push(emiratesId);
    }
    if (passportNumber !== undefined) {
      tenantParamCount++;
      tenantUpdates.push(`passport_number = $${tenantParamCount}`);
      tenantParams.push(passportNumber);
    }
    if (visaNumber !== undefined) {
      tenantParamCount++;
      tenantUpdates.push(`visa_number = $${tenantParamCount}`);
      tenantParams.push(visaNumber);
    }
    if (currentAddress !== undefined) {
      tenantParamCount++;
      tenantUpdates.push(`current_address = $${tenantParamCount}`);
      tenantParams.push(JSON.stringify(currentAddress));
    }

    if (tenantUpdates.length > 0) {
      tenantParamCount++;
      tenantParams.push(id);
      await query(
        `UPDATE tenants SET ${tenantUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${tenantParamCount}`,
        tenantParams
      );
    }

    res.json({
      success: true,
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get Maintenance Requests (from owner's tenants)
export const getMaintenanceRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const { status, page = 1, limit = 20 } = req.query;

    let whereClause = 'WHERE p.owner_id = $1';
    const params: any[] = [ownerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND mr.status = $${paramCount}`;
      params.push(status);
    }

    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT mr.*, p.property_name, p.address as property_address,
       t.full_name as tenant_name, u.email as tenant_email, u.mobile as tenant_mobile
       FROM maintenance_requests mr
       JOIN properties p ON mr.property_id = p.id
       JOIN tenants t ON mr.tenant_id = t.id
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY mr.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    const maintenanceRequests = result.rows.map((request: any) => {
      if (request.property_address && typeof request.property_address === 'string') {
        try {
          request.property_address = JSON.parse(request.property_address);
        } catch {
          // keep original string if parsing fails
        }
      }
      return request;
    });

    for (const request of maintenanceRequests) {
      const photosResult = await query(
        'SELECT photo_url FROM maintenance_request_photos WHERE maintenance_request_id = $1',
        [request.id]
      );
      request.photos = photosResult.rows.map((row) => row.photo_url);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM maintenance_requests mr
       JOIN properties p ON mr.property_id = p.id
       ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        maintenanceRequests,
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

// Update Maintenance Request Status
export const updateMaintenanceRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
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

    // Verify authorization
    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0 || maintenanceRequest.owner_id !== ownerResult.rows[0].id) {
      throw new AppError('Unauthorized', 403);
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
  } catch (error) {
    next(error);
  }
};
