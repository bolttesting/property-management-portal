import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { notifications } from '../services/email/notifications';

// Register Tenant
export const registerTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      email,
      mobile,
      password,
      fullName,
      nationality,
      employmentStatus,
      registrationSource,
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
    // Emirates ID and passport number are optional - can be added later in profile

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR mobile = $2',
      [email || null, mobile || null]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists with this email or mobile', 400);
    }

    // Check if Emirates ID already exists (only if provided and not empty)
    if (emiratesId && typeof emiratesId === 'string' && emiratesId.trim() !== '') {
      const existingEmiratesId = await query(
        'SELECT id FROM tenants WHERE emirates_id = $1',
        [emiratesId.trim()]
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

    // Create tenant profile with all UAE documents
    // Build dynamic query to only include fields that are provided (avoid NULL issues with UNIQUE constraints)
    // Validate registration_source to match database CHECK constraint
    const validRegistrationSources = ['mobile', 'email', 'facebook', 'created_by_owner']
    let finalRegistrationSource = 'email' // Default
    
    if (registrationSource && validRegistrationSources.includes(registrationSource)) {
      finalRegistrationSource = registrationSource
    } else {
      // Auto-detect based on what's provided
      if (email && mobile) {
        finalRegistrationSource = 'email'
      } else if (mobile && !email) {
        finalRegistrationSource = 'mobile'
      } else if (email && !mobile) {
        finalRegistrationSource = 'email'
      }
    }
    
    console.log('Creating tenant with request data:', {
      email,
      mobile,
      fullName,
      hasEmiratesId: !!emiratesId,
      emiratesId: emiratesId ? 'provided' : 'not provided',
      registrationSource: finalRegistrationSource,
    })
    
    const tenantFields: string[] = ['user_id', 'full_name', 'registration_source']
    const tenantValues: any[] = [userId, fullName, finalRegistrationSource]
    let paramCount = 3

    if (nationality !== undefined && nationality !== null && nationality !== '') {
      tenantFields.push('nationality')
      tenantValues.push(nationality)
      paramCount++
    }
    if (employmentStatus !== undefined && employmentStatus !== null && employmentStatus !== '') {
      tenantFields.push('employment_status')
      tenantValues.push(employmentStatus)
      paramCount++
    }
    if (emiratesId !== undefined && emiratesId !== null && emiratesId !== '' && String(emiratesId).trim() !== '') {
      tenantFields.push('emirates_id')
      tenantValues.push(String(emiratesId).trim())
      paramCount++
    }
    if (passportNumber !== undefined && passportNumber !== null && passportNumber !== '' && String(passportNumber).trim() !== '') {
      tenantFields.push('passport_number')
      tenantValues.push(String(passportNumber).trim())
      paramCount++
    }
    if (visaNumber !== undefined && visaNumber !== null && visaNumber !== '' && String(visaNumber).trim() !== '') {
      tenantFields.push('visa_number')
      tenantValues.push(String(visaNumber).trim())
      paramCount++
    }
    if (currentAddress !== undefined && currentAddress !== null) {
      tenantFields.push('current_address')
      tenantValues.push(JSON.stringify(currentAddress))
      paramCount++
    }

    const placeholders = tenantFields.map((_, index) => `$${index + 1}`).join(', ')
    const insertQuery = `INSERT INTO tenants (${tenantFields.join(', ')})
       VALUES (${placeholders})`
    
    console.log('Executing tenant insert query:', insertQuery)
    console.log('With values:', tenantValues)
    
    try {
      await query(insertQuery, tenantValues)
      console.log('Tenant created successfully')
    } catch (dbError: any) {
      console.error('Database error during tenant creation:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        constraint: dbError.constraint,
      })
      throw dbError
    }

    // Store employment and document details in a separate table or JSON field
    // For now, we'll store employment details in a JSON field if needed
    // Documents will be stored when tenant applies for a property

    // Generate JWT token
    const token = generateToken(userId, 'tenant');

    notifications
      .welcomeEmail({
        email,
        name: fullName,
        accountType: 'tenant',
        dashboardUrl: 'https://property-management-frontend-production.up.railway.app/tenant/dashboard',
      })
      .catch((error) => console.error('Failed to queue welcome email (tenant):', error));

    res.status(201).json({
      success: true,
      message: 'Tenant registered successfully',
      data: {
        token,
        user: {
          id: userId,
          email,
          mobile,
          userType: 'tenant',
        },
      },
    });
  } catch (error: any) {
    // Log error details for debugging
    console.error('Tenant registration error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column,
    });
    
    // If it's a database error, provide more helpful message
    if (error.code === '23505') { // Unique violation
      if (error.constraint?.includes('emirates_id')) {
        throw new AppError('Emirates ID already registered', 400);
      }
      if (error.constraint?.includes('email') || error.constraint?.includes('mobile')) {
        throw new AppError('User already exists with this email or mobile', 400);
      }
    }
    
    next(error);
  }
};

// Register Owner
export const registerOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      email,
      mobile,
      password,
      firstName,
      lastName,
      ownerType,
      emiratesId,
      companyName,
      tradeLicenseNumber,
      reraRegistration,
      serviceAreas,
      propertyTypes,
    } = req.body;

    // Validation
    if (!email && !mobile) {
      throw new AppError('Email or mobile number is required', 400);
    }
    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }
    if (!firstName || !lastName) {
      throw new AppError('First name and last name are required', 400);
    }
    if (!ownerType) {
      throw new AppError('Owner type is required', 400);
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR mobile = $2',
      [email || null, mobile || null]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists with this email or mobile', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, email, mobile, password_hash, user_type, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email || null, mobile || null, passwordHash, 'owner', 'pending']
    );

    // Create owner profile
    await query(
      `INSERT INTO owners (user_id, first_name, last_name, owner_type, emirates_id, company_name, trade_license_number, rera_registration, service_areas, property_types, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        firstName,
        lastName,
        ownerType,
        emiratesId || null,
        companyName || null,
        tradeLicenseNumber || null,
        reraRegistration || null,
        serviceAreas || [],
        propertyTypes || [],
        'pending_approval',
      ]
    );

    notifications
      .welcomeEmail({
        email,
        name: `${firstName} ${lastName}`.trim(),
        accountType: 'owner',
        dashboardUrl: 'https://property-management-frontend-production.up.railway.app/owner/dashboard',
      })
      .catch((error) => console.error('Failed to queue welcome email (owner):', error));

    res.status(201).json({
      success: true,
      message: 'Owner registration submitted successfully. Please wait for admin approval.',
      data: {
        userId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, mobile, password } = req.body;

    if (!password) {
      throw new AppError('Password is required', 400);
    }
    if (!email && !mobile) {
      throw new AppError('Email or mobile number is required', 400);
    }

    // Find user
    const userResult = await query(
      'SELECT id, email, mobile, password_hash, user_type, status FROM users WHERE email = $1 OR mobile = $2',
      [email || null, mobile || null]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = userResult.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AppError('Account is not active. Please contact support.', 403);
    }

    // Update last login
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Generate token
    const token = generateToken(user.id, user.user_type);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          userType: user.user_type,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login with Mobile (OTP)
export const loginWithMobile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      throw new AppError('Mobile number and OTP are required', 400);
    }

    // Verify OTP (simplified - in production, verify against stored OTP)
    // For now, this is a placeholder
    const otpResult = await query(
      'SELECT * FROM otp_storage WHERE mobile = $1 AND otp_code = $2 AND expires_at > CURRENT_TIMESTAMP AND verified = FALSE',
      [mobile, otp]
    );

    if (otpResult.rows.length === 0) {
      throw new AppError('Invalid or expired OTP', 401);
    }

    // Mark OTP as verified
    await query('UPDATE otp_storage SET verified = TRUE WHERE mobile = $1 AND otp_code = $2', [mobile, otp]);

    // Find user
    const userResult = await query(
      'SELECT id, email, mobile, user_type, status FROM users WHERE mobile = $1',
      [mobile]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    // Update mobile verification and last login
    await query(
      'UPDATE users SET mobile_verified = TRUE, last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = generateToken(user.id, user.user_type);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          userType: user.user_type,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Send OTP
export const sendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      throw new AppError('Mobile number is required', 400);
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || '5'));

    // Store OTP
    await query(
      'INSERT INTO otp_storage (mobile, otp_code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [mobile, otp, 'login', expiresAt]
    );

    // TODO: Send SMS via Twilio or SMS service
    // For now, return OTP in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`OTP for ${mobile}: ${otp}`);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV === 'development' && { otp }), // Only in development
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP
export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      throw new AppError('Mobile number and OTP are required', 400);
    }

    const otpResult = await query(
      'SELECT * FROM otp_storage WHERE mobile = $1 AND otp_code = $2 AND expires_at > CURRENT_TIMESTAMP AND verified = FALSE',
      [mobile, otp]
    );

    if (otpResult.rows.length === 0) {
      throw new AppError('Invalid or expired OTP', 401);
    }

    // Mark as verified
    await query('UPDATE otp_storage SET verified = TRUE WHERE mobile = $1 AND otp_code = $2', [mobile, otp]);

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get Current User
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userResult = await query(
      'SELECT id, email, mobile, user_type, status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = req.user.id;
    const userType = req.user.userType;
    const { email, mobile, password, ...profileData } = req.body;

    // Update user table fields (email, mobile)
    const userUpdates: string[] = [];
    const userParams: any[] = [];
    let userParamCount = 0;

    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingEmail = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (existingEmail.rows.length > 0) {
        throw new AppError('Email already in use', 400);
      }
      userParamCount++;
      userUpdates.push(`email = $${userParamCount}`);
      userParams.push(email);
    }

    if (mobile !== undefined) {
      // Check if mobile is already taken by another user
      const existingMobile = await query('SELECT id FROM users WHERE mobile = $1 AND id != $2', [mobile, userId]);
      if (existingMobile.rows.length > 0) {
        throw new AppError('Mobile number already in use', 400);
      }
      userParamCount++;
      userUpdates.push(`mobile = $${userParamCount}`);
      userParams.push(mobile);
    }

    if (password !== undefined) {
      if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
      }
      const passwordHash = await bcrypt.hash(password, 10);
      userParamCount++;
      userUpdates.push(`password_hash = $${userParamCount}`);
      userParams.push(passwordHash);
    }

    // Update user table if there are changes
    if (userUpdates.length > 0) {
      userParamCount++;
      userParams.push(userId);
      await query(
        `UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${userParamCount}`,
        userParams
      );
    }

    // Update profile based on user type
    if (userType === 'tenant') {
      const {
        fullName,
        nationality,
        employmentStatus,
        emiratesId,
        passportNumber,
        visaNumber,
        currentAddress,
      } = profileData;

      const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [userId]);
      if (tenantResult.rows.length === 0) {
        throw new AppError('Tenant profile not found', 404);
      }

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
        // Check if emirates_id is already taken
        const existingEmiratesId = await query(
          'SELECT id FROM tenants WHERE emirates_id = $1 AND user_id != $2',
          [emiratesId, userId]
        );
        if (existingEmiratesId.rows.length > 0) {
          throw new AppError('Emirates ID already in use', 400);
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
        tenantParams.push(tenantResult.rows[0].id);
        await query(
          `UPDATE tenants SET ${tenantUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${tenantParamCount}`,
          tenantParams
        );
      }
    } else if (userType === 'owner') {
      const {
        firstName,
        lastName,
        emiratesId,
        passportNumber,
        companyName,
        tradeLicenseNumber,
        reraRegistration,
        contactPerson,
        serviceAreas,
        propertyTypes,
      } = profileData;

      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [userId]);
      if (ownerResult.rows.length === 0) {
        throw new AppError('Owner profile not found', 404);
      }

      const ownerUpdates: string[] = [];
      const ownerParams: any[] = [];
      let ownerParamCount = 0;

      if (firstName !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`first_name = $${ownerParamCount}`);
        ownerParams.push(firstName);
      }
      if (lastName !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`last_name = $${ownerParamCount}`);
        ownerParams.push(lastName);
      }
      if (emiratesId !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`emirates_id = $${ownerParamCount}`);
        ownerParams.push(emiratesId);
      }
      if (passportNumber !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`passport_number = $${ownerParamCount}`);
        ownerParams.push(passportNumber);
      }
      if (companyName !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`company_name = $${ownerParamCount}`);
        ownerParams.push(companyName);
      }
      if (tradeLicenseNumber !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`trade_license_number = $${ownerParamCount}`);
        ownerParams.push(tradeLicenseNumber);
      }
      if (reraRegistration !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`rera_registration = $${ownerParamCount}`);
        ownerParams.push(reraRegistration);
      }
      if (contactPerson !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`contact_person = $${ownerParamCount}`);
        ownerParams.push(JSON.stringify(contactPerson));
      }
      if (serviceAreas !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`service_areas = $${ownerParamCount}`);
        ownerParams.push(serviceAreas);
      }
      if (propertyTypes !== undefined) {
        ownerParamCount++;
        ownerUpdates.push(`property_types = $${ownerParamCount}`);
        ownerParams.push(propertyTypes);
      }

      if (ownerUpdates.length > 0) {
        ownerParamCount++;
        ownerParams.push(ownerResult.rows[0].id);
        await query(
          `UPDATE owners SET ${ownerUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${ownerParamCount}`,
          ownerParams
        );
      }
    }
    // Admin users only have user table fields, which are already updated above

    res.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Change Password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    // Get current user's password hash
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const currentPasswordHash = userResult.rows[0].password_hash;

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Refresh Token
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Placeholder - implement refresh token logic
    res.json({
      success: true,
      message: 'Token refreshed',
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Placeholder
    res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Placeholder
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Since we're using JWT, logout is handled client-side by removing token
    // In future, can implement token blacklist
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate JWT token
function generateToken(userId: string, userType: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(
    {
      userId,
      userType,
    },
    jwtSecret,
    {
      expiresIn: expiresIn,
    } as jwt.SignOptions
  );
}

