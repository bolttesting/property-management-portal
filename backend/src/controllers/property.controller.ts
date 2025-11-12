import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query } from '../database/connection';
import jwt from 'jsonwebtoken';

// Get All Properties (Public)
export const getAllProperties = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, type, category, listingType } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Exclude properties that are occupied/leased or sold (have approved applications with active leases)
    // For rent properties: exclude if status is 'occupied' or has active lease
    // For sale properties: exclude if status is 'sold' or has approved application
    whereClause += ` AND p.status NOT IN ('occupied', 'sold')`;
    whereClause += ` AND NOT EXISTS (
      SELECT 1 FROM applications a
      JOIN leases l ON a.id = l.application_id
      WHERE a.property_id = p.id 
      AND a.status = 'approved'
      AND (l.status = 'active' OR p.status = 'occupied')
    )`;
    whereClause += ` AND NOT EXISTS (
      SELECT 1 FROM applications a
      WHERE a.property_id = p.id
      AND a.status = 'approved'
      AND p.listing_type = 'sale'
      AND p.status = 'sold'
    )`;

    if (status) {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND p.property_type = $${paramCount}`;
      params.push(type);
    }

    if (category) {
      paramCount++;
      whereClause += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    if (listingType) {
      paramCount++;
      whereClause += ` AND COALESCE(p.listing_type, 'rent') = $${paramCount}`;
      params.push(listingType);
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT p.*, o.first_name, o.last_name, o.company_name,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
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

    const countResult = await query(`SELECT COUNT(*) FROM properties p ${whereClause}`, params.slice(0, -2));

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

// Search Properties
export const searchProperties = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      q, // Search query (searches in property_name, description, location, area)
      location, // Filter by location
      area, // Filter by area
      type, // Filter by property_type
      category, // Filter by category
      status, // Filter by status
      listingType, // Filter by listing_type (rent or sale)
      minPrice, // Minimum price
      maxPrice, // Maximum price
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Exclude properties that are occupied/leased or sold (have approved applications with active leases)
    whereClause += ` AND p.status NOT IN ('occupied', 'sold')`;
    whereClause += ` AND NOT EXISTS (
      SELECT 1 FROM applications a
      JOIN leases l ON a.id = l.application_id
      WHERE a.property_id = p.id 
      AND a.status = 'approved'
      AND (l.status = 'active' OR p.status = 'occupied')
    )`;
    whereClause += ` AND NOT EXISTS (
      SELECT 1 FROM applications a
      WHERE a.property_id = p.id
      AND a.status = 'approved'
      AND p.listing_type = 'sale'
      AND p.status = 'sold'
    )`;

    // Search query (searches in property_name, description, location, area)
    if (q) {
      paramCount++;
      whereClause += ` AND (
        p.property_name ILIKE $${paramCount} OR
        p.description ILIKE $${paramCount} OR
        p.address->>'location' ILIKE $${paramCount} OR
        p.address->>'area' ILIKE $${paramCount}
      )`;
      params.push(`%${q}%`);
    }

    // Filter by location
    if (location) {
      paramCount++;
      whereClause += ` AND p.address->>'location' ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }

    // Filter by area
    if (area) {
      paramCount++;
      whereClause += ` AND p.address->>'area' ILIKE $${paramCount}`;
      params.push(`%${area}%`);
    }

    // Filter by property type
    if (type) {
      paramCount++;
      whereClause += ` AND p.property_type = $${paramCount}`;
      params.push(type);
    }

    // Filter by category
    if (category) {
      paramCount++;
      whereClause += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    // Filter by status
    if (status) {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    // Filter by listing type (rent or sale)
    if (listingType) {
      paramCount++;
      whereClause += ` AND COALESCE(p.listing_type, 'rent') = $${paramCount}`;
      params.push(listingType);
    }

    // Filter by minimum price
    if (minPrice) {
      paramCount++;
      whereClause += ` AND p.price >= $${paramCount}`;
      params.push(Number(minPrice));
    }

    // Filter by maximum price
    if (maxPrice) {
      paramCount++;
      whereClause += ` AND p.price <= $${paramCount}`;
      params.push(Number(maxPrice));
    }

    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT p.*, o.first_name, o.last_name, o.company_name,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    // Get total count for pagination
    const countParams = params.slice(0, -2);
    const countResult = await query(`SELECT COUNT(*) FROM properties p ${whereClause}`, countParams);

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

// Get Property by ID
export const getPropertyById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate UUID format to prevent SQL injection and provide better error messages
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('Invalid property ID format:', id);
      throw new AppError('Invalid property ID format', 400);
    }

    const propertyResult = await query(
      `SELECT p.*, o.first_name, o.last_name, o.company_name, o.owner_type,
       o.user_id as owner_user_id,
       u.email as owner_email, u.mobile as owner_mobile
       FROM properties p
       JOIN owners o ON p.owner_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const imagesResult = await query(
      'SELECT * FROM property_images WHERE property_id = $1 ORDER BY image_order, created_at',
      [id]
    );
    
    // Debug: Log images being returned
    console.log('=== getPropertyById Images Debug ===');
    console.log('Property ID:', id);
    console.log('Images found:', imagesResult.rows.length);
    imagesResult.rows.forEach((img: any, index: number) => {
      console.log(`Image ${index}:`, {
        id: img.id,
        image_url: img.image_url,
        is_primary: img.is_primary,
        image_order: img.image_order
      });
    });
    console.log('===================================');

    // Parse address JSONB if it's a string
    const property = propertyResult.rows[0];
    if (property.address && typeof property.address === 'string') {
      try {
        property.address = JSON.parse(property.address);
      } catch (e) {
        console.warn('Failed to parse address JSONB:', e);
        property.address = {};
      }
    }
    
    // Debug: Log property data for troubleshooting
    console.log('=== getPropertyById Debug ===');
    console.log('Property ID:', id);
    console.log('Address type:', typeof property.address);
    console.log('Address value:', JSON.stringify(property.address, null, 2));
    console.log('Bedrooms:', property.address?.bedrooms);
    console.log('Bathrooms:', property.address?.bathrooms);
    console.log('Area:', property.address?.area);
    console.log('Parking:', property.address?.parkingSpaces);
    console.log('============================');

    // Get user application status if user is authenticated (from token in headers)
    let userApplication = null;
    let activeLease: any = null;
    let rentPayments: any[] = [];
    let canViewLeaseDetails = false;
    let viewerTenantId: string | null = null;
    let viewerOwnerId: string | null = null;
    
    // Try to extract user from auth header if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        if (decoded.userType === 'tenant') {
          // Get tenant's application for this property
          const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [decoded.id]);
          if (tenantResult.rows.length > 0) {
            const tenantId = tenantResult.rows[0].id;
            viewerTenantId = tenantId;
            const appResult = await query(
              `SELECT id, status, created_at FROM applications 
               WHERE property_id = $1 AND tenant_id = $2 
               AND status NOT IN ('rejected', 'cancelled')
               ORDER BY created_at DESC
               LIMIT 1`,
              [id, tenantId]
            );
            if (appResult.rows.length > 0) {
              userApplication = appResult.rows[0];
            }
            
            // Get active lease if property is occupied and tenant is the leasee
            if (property.status === 'occupied' && property.current_lease_id) {
              const leaseResult = await query(
                `SELECT l.* FROM leases l
                 WHERE l.id = $1 AND l.tenant_id = $2 AND l.status = 'active'`,
                [property.current_lease_id, tenantId]
              );
              if (leaseResult.rows.length > 0) {
                activeLease = leaseResult.rows[0];
                canViewLeaseDetails = true;
              }
            }
          }
        } else if (decoded.userType === 'owner') {
          const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [decoded.id]);
          if (ownerResult.rows.length > 0) {
            viewerOwnerId = ownerResult.rows[0].id;
            if (property.owner_id === viewerOwnerId) {
              canViewLeaseDetails = true;
            }
          }
        }
      } catch (error) {
        // If token is invalid or expired, just continue without user-specific data
        console.log('Could not verify token for property details:', error);
      }
    }

    if (property.current_lease_id && canViewLeaseDetails) {
      const leaseResult = await query(
        `SELECT l.*, t.full_name as tenant_name, u.email as tenant_email, u.mobile as tenant_mobile, u.id as tenant_user_id
         FROM leases l
         JOIN tenants t ON l.tenant_id = t.id
         JOIN users u ON t.user_id = u.id
         WHERE l.id = $1`,
        [property.current_lease_id]
      );

      if (leaseResult.rows.length > 0) {
        activeLease = leaseResult.rows[0];
        if (activeLease.payment_plan && typeof activeLease.payment_plan === 'string') {
          try {
            activeLease.payment_plan = JSON.parse(activeLease.payment_plan);
          } catch {
            // keep as string
          }
        }

        const paymentsResult = await query(
          `SELECT * FROM rent_payments WHERE lease_id = $1 ORDER BY due_date ASC`,
          [property.current_lease_id]
        );
        rentPayments = paymentsResult.rows;
      }
    }

    // Hide sensitive lease details if viewer is not authorized
    if (!canViewLeaseDetails) {
      activeLease = null;
      rentPayments = [];
    }

    res.json({
      success: true,
      data: {
        property: property,
        images: imagesResult.rows,
        userApplication: userApplication,
        activeLease: activeLease,
        rentPayments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Property Images
export const getPropertyImages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM property_images WHERE property_id = $1 ORDER BY image_order, created_at',
      [id]
    );

    res.json({
      success: true,
      data: {
        images: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create Property (Protected)
export const createProperty = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Get owner_id from user
    const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
    if (ownerResult.rows.length === 0) {
      throw new AppError('Owner profile not found', 404);
    }

    const ownerId = ownerResult.rows[0].id;
    const {
      propertyName,
      propertyType,
      category,
      listingType,
      address,
      description,
      price,
      features,
      location,
      bedrooms,
      bathrooms,
      area,
      areaUnit,
      parkingSpaces,
      furnished,
      yearBuilt,
      floorNumber,
      totalFloors,
      community,
      street,
      videoUrl,
      virtualTourUrl,
    } = req.body;

    // Validation
    if (!propertyName || !propertyType || !category || !address || !price) {
      throw new AppError('Missing required fields', 400);
    }

    // Build comprehensive address object with all UAE property details
    // Handle numeric fields properly - check for undefined, not falsy (0 is valid)
    const addressWithDetails = {
      ...address,
      location: location !== undefined ? location : (address?.location || address?.area || ''), // Location for filtering (e.g., "Dubai Downtown")
      community: community !== undefined ? community : (address?.community || ''),
      street: street !== undefined ? street : (address?.street || ''),
      bedrooms: bedrooms !== undefined && bedrooms !== null ? (typeof bedrooms === 'string' ? parseInt(bedrooms) : bedrooms) : (address?.bedrooms !== undefined ? address.bedrooms : null),
      bathrooms: bathrooms !== undefined && bathrooms !== null ? (typeof bathrooms === 'string' ? parseFloat(bathrooms) : bathrooms) : (address?.bathrooms !== undefined ? address.bathrooms : null),
      area: area !== undefined && area !== null ? (typeof area === 'string' && !isNaN(parseFloat(area)) ? parseFloat(area) : (typeof area === 'number' ? area : null)) : (address?.area !== undefined ? address.area : null),
      areaUnit: areaUnit !== undefined ? areaUnit : (address?.areaUnit || 'sqft'),
      parkingSpaces: parkingSpaces !== undefined && parkingSpaces !== null ? (typeof parkingSpaces === 'string' ? parseInt(parkingSpaces) : parkingSpaces) : (address?.parkingSpaces !== undefined ? address.parkingSpaces : null),
      furnished: furnished !== undefined ? furnished : (address?.furnished !== undefined ? address.furnished : false),
      yearBuilt: yearBuilt !== undefined && yearBuilt !== null ? (typeof yearBuilt === 'string' ? parseInt(yearBuilt) : yearBuilt) : (address?.yearBuilt !== undefined ? address.yearBuilt : null),
      floorNumber: floorNumber !== undefined && floorNumber !== null ? (typeof floorNumber === 'string' ? parseInt(floorNumber) : floorNumber) : (address?.floorNumber !== undefined ? address.floorNumber : null),
      totalFloors: totalFloors !== undefined && totalFloors !== null ? (typeof totalFloors === 'string' ? parseInt(totalFloors) : totalFloors) : (address?.totalFloors !== undefined ? address.totalFloors : null),
    };

    // Use virtualTourUrl if provided, otherwise use videoUrl
    const finalVirtualTourUrl = virtualTourUrl || videoUrl || null;
    // Use listingType if provided, default to 'rent' if not specified (for backward compatibility)
    const finalListingType = listingType || 'rent';

    const result = await query(
      `INSERT INTO properties (owner_id, property_name, property_type, category, listing_type, address, description, price, features, status, virtual_tour_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        ownerId,
        propertyName,
        propertyType,
        category,
        finalListingType,
        JSON.stringify(addressWithDetails),
        description,
        price,
        features || [],
        'vacant',
        finalVirtualTourUrl,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: {
        property: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Property
export const updateProperty = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can update properties', 403);
    }

    const { id } = req.params;
    const {
      propertyName,
      propertyType,
      category,
      address,
      description,
      price,
      features,
      status,
      location,
      bedrooms,
      bathrooms,
      area,
      areaUnit,
      parkingSpaces,
      furnished,
      yearBuilt,
      floorNumber,
      totalFloors,
      community,
      street,
      videoUrl,
      virtualTourUrl,
    } = req.body;

    // Get property
    const propertyResult = await query('SELECT * FROM properties WHERE id = $1', [id]);
    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const property = propertyResult.rows[0];

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || property.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (propertyName !== undefined) {
      paramCount++;
      updates.push(`property_name = $${paramCount}`);
      params.push(propertyName);
    }
    if (propertyType !== undefined) {
      paramCount++;
      updates.push(`property_type = $${paramCount}`);
      params.push(propertyType);
    }
    if (category !== undefined) {
      paramCount++;
      updates.push(`category = $${paramCount}`);
      params.push(category);
    }
    if (address !== undefined || location !== undefined || bedrooms !== undefined || bathrooms !== undefined || 
        area !== undefined || areaUnit !== undefined || parkingSpaces !== undefined || furnished !== undefined ||
        yearBuilt !== undefined || floorNumber !== undefined || totalFloors !== undefined || 
        community !== undefined || street !== undefined) {
      // Merge existing address with new values
      const existingAddress = property.address || {};
      // Parse existing address if it's a string
      let parsedExistingAddress = existingAddress;
      if (typeof existingAddress === 'string') {
        try {
          parsedExistingAddress = JSON.parse(existingAddress);
        } catch (e) {
          parsedExistingAddress = {};
        }
      }
      
      const addressWithDetails = {
        ...parsedExistingAddress,
        ...(address || {}),
        // Preserve location (string) separately from area (number)
        location: location !== undefined ? location : (address?.location || parsedExistingAddress.location || parsedExistingAddress.area || ''),
        area: area !== undefined ? (typeof area === 'string' && !isNaN(parseFloat(area)) ? parseFloat(area) : (typeof area === 'number' ? area : null)) : (parsedExistingAddress.area && typeof parsedExistingAddress.area === 'number' ? parsedExistingAddress.area : (typeof parsedExistingAddress.area === 'string' && !isNaN(parseFloat(parsedExistingAddress.area)) ? parseFloat(parsedExistingAddress.area) : null)),
        community: community !== undefined ? community : (address?.community || parsedExistingAddress.community || ''),
        street: street !== undefined ? street : (address?.street || parsedExistingAddress.street || ''),
        bedrooms: bedrooms !== undefined && bedrooms !== null ? (typeof bedrooms === 'string' ? parseInt(bedrooms) : bedrooms) : (parsedExistingAddress.bedrooms !== undefined ? parsedExistingAddress.bedrooms : null),
        bathrooms: bathrooms !== undefined && bathrooms !== null ? (typeof bathrooms === 'string' ? parseFloat(bathrooms) : bathrooms) : (parsedExistingAddress.bathrooms !== undefined ? parsedExistingAddress.bathrooms : null),
        areaUnit: areaUnit !== undefined ? areaUnit : (address?.areaUnit || parsedExistingAddress.areaUnit || 'sqft'),
        parkingSpaces: parkingSpaces !== undefined && parkingSpaces !== null ? (typeof parkingSpaces === 'string' ? parseInt(parkingSpaces) : parkingSpaces) : (parsedExistingAddress.parkingSpaces !== undefined ? parsedExistingAddress.parkingSpaces : null),
        furnished: furnished !== undefined ? furnished : (address?.furnished !== undefined ? address.furnished : (parsedExistingAddress.furnished !== undefined ? parsedExistingAddress.furnished : false)),
        yearBuilt: yearBuilt !== undefined && yearBuilt !== null ? (typeof yearBuilt === 'string' ? parseInt(yearBuilt) : yearBuilt) : (parsedExistingAddress.yearBuilt !== undefined ? parsedExistingAddress.yearBuilt : null),
        floorNumber: floorNumber !== undefined && floorNumber !== null ? (typeof floorNumber === 'string' ? parseInt(floorNumber) : floorNumber) : (parsedExistingAddress.floorNumber !== undefined ? parsedExistingAddress.floorNumber : null),
        totalFloors: totalFloors !== undefined && totalFloors !== null ? (typeof totalFloors === 'string' ? parseInt(totalFloors) : totalFloors) : (parsedExistingAddress.totalFloors !== undefined ? parsedExistingAddress.totalFloors : null),
      };
      paramCount++;
      updates.push(`address = $${paramCount}`);
      params.push(JSON.stringify(addressWithDetails));
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (price !== undefined) {
      paramCount++;
      updates.push(`price = $${paramCount}`);
      params.push(price);
    }
    if (features !== undefined) {
      paramCount++;
      updates.push(`features = $${paramCount}`);
      params.push(features);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    if (virtualTourUrl !== undefined || videoUrl !== undefined) {
      const finalVirtualTourUrl = virtualTourUrl !== undefined ? virtualTourUrl : (videoUrl !== undefined ? videoUrl : property.virtual_tour_url);
      paramCount++;
      updates.push(`virtual_tour_url = $${paramCount}`);
      params.push(finalVirtualTourUrl);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    await query(
      `UPDATE properties SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      params
    );

    // Return updated property
    const updatedPropertyResult = await query('SELECT * FROM properties WHERE id = $1', [id]);
    const updatedProperty = updatedPropertyResult.rows[0];
    
    // Parse address JSONB if it's a string
    if (updatedProperty.address && typeof updatedProperty.address === 'string') {
      try {
        updatedProperty.address = JSON.parse(updatedProperty.address);
      } catch (e) {
        // If parsing fails, keep as is
      }
    }

    // Debug: Log the saved address to verify data
    console.log('Property updated - Address saved:', JSON.stringify(updatedProperty.address, null, 2));
    console.log('Bedrooms:', updatedProperty.address?.bedrooms);
    console.log('Bathrooms:', updatedProperty.address?.bathrooms);
    console.log('Parking:', updatedProperty.address?.parkingSpaces);

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: {
        property: updatedProperty,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete Property
export const deleteProperty = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (req.user.userType !== 'owner' && req.user.userType !== 'admin') {
      throw new AppError('Only owners and admins can delete properties', 403);
    }

    const { id } = req.params;

    // Get property
    const propertyResult = await query('SELECT * FROM properties WHERE id = $1', [id]);
    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const property = propertyResult.rows[0];

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || property.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    }

    // Check if property has active lease
    if (property.current_lease_id) {
      throw new AppError('Cannot delete property with active lease', 400);
    }

    // Get all images for this property
    const imagesResult = await query(
      'SELECT image_url FROM property_images WHERE property_id = $1',
      [id]
    );

    // Delete image files from filesystem
    const fs = require('fs');
    const path = require('path');
    
    // Get upload directory
    const uploadDir = process.env.UPLOAD_DIR || 
      (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads') : './uploads');
    const resolvedUploadDir = path.resolve(uploadDir);
    const imagesDir = path.join(resolvedUploadDir, 'images');

    let deletedFiles = 0;
    for (const image of imagesResult.rows) {
      const imageUrl = image.image_url;
      // Extract filename from image_url
      let filename = imageUrl;
      if (imageUrl.includes('/')) {
        filename = path.basename(imageUrl);
      }
      
      const imagePath = path.join(imagesDir, filename);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          deletedFiles++;
          console.log(`✅ Deleted image file: ${imagePath}`);
        } catch (fileError: any) {
          console.warn(`⚠️  Failed to delete image file: ${imagePath}`, fileError.message);
          // Continue even if file deletion fails
        }
      }
    }

    // Delete property (cascade will handle related records including property_images)
    await query('DELETE FROM properties WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `Property deleted successfully. ${deletedFiles} image file(s) deleted.`,
      data: {
        deletedFiles,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Add to Favorites
export const addToFavorites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id: propertyId } = req.params;

    // Get tenant_id
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }

    const tenantId = tenantResult.rows[0].id;

    await query(
      'INSERT INTO property_favorites (tenant_id, property_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [tenantId, propertyId]
    );

    res.json({
      success: true,
      message: 'Property added to favorites',
    });
  } catch (error) {
    next(error);
  }
};

// Remove from Favorites
export const removeFromFavorites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id: propertyId } = req.params;
    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);

    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }

    const tenantId = tenantResult.rows[0].id;

    await query('DELETE FROM property_favorites WHERE tenant_id = $1 AND property_id = $2', [tenantId, propertyId]);

    res.json({
      success: true,
      message: 'Property removed from favorites',
    });
  } catch (error) {
    next(error);
  }
};

// Get Favorite Properties
export const getFavoriteProperties = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const tenantResult = await query('SELECT id FROM tenants WHERE user_id = $1', [req.user.id]);
    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant profile not found', 404);
    }

    const tenantId = tenantResult.rows[0].id;

    const result = await query(
      `SELECT p.*, o.first_name, o.last_name, o.company_name,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image
       FROM properties p
       JOIN property_favorites pf ON p.id = pf.property_id
       JOIN owners o ON p.owner_id = o.id
       WHERE pf.tenant_id = $1
       ORDER BY pf.created_at DESC`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        properties: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Add Property Images
export const addPropertyImages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id: propertyId } = req.params;
    const { imageUrls, primaryImageIndex } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new AppError('Image URLs are required', 400);
    }

    // Verify property exists and user has permission
    const propertyResult = await query('SELECT * FROM properties WHERE id = $1', [propertyId]);
    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const property = propertyResult.rows[0];

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || property.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    // Get current max image_order
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(image_order), 0) as max_order FROM property_images WHERE property_id = $1',
      [propertyId]
    );
    let currentOrder = parseInt(maxOrderResult.rows[0].max_order) + 1;

    // Insert images
    const insertedImages = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const isPrimary = primaryImageIndex !== undefined && i === primaryImageIndex;

      // If this is marked as primary, unset other primary images
      if (isPrimary) {
        await query(
          'UPDATE property_images SET is_primary = FALSE WHERE property_id = $1',
          [propertyId]
        );
      }

      const imageResult = await query(
        `INSERT INTO property_images (property_id, image_url, image_order, is_primary)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [propertyId, imageUrl, currentOrder + i, isPrimary]
      );

      insertedImages.push(imageResult.rows[0]);
    }

    res.json({
      success: true,
      message: 'Images added successfully',
      data: {
        images: insertedImages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete Property Image (Protected)
export const deletePropertyImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { id: propertyId, imageId } = req.params;

    if (!imageId) {
      throw new AppError('Image ID is required', 400);
    }

    // Verify property exists and user has permission
    const propertyResult = await query('SELECT * FROM properties WHERE id = $1', [propertyId]);
    if (propertyResult.rows.length === 0) {
      throw new AppError('Property not found', 404);
    }

    const property = propertyResult.rows[0];

    // Verify authorization
    if (req.user.userType === 'owner') {
      const ownerResult = await query('SELECT id FROM owners WHERE user_id = $1', [req.user.id]);
      if (ownerResult.rows.length === 0 || property.owner_id !== ownerResult.rows[0].id) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user.userType !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    // Get image record
    const imageResult = await query(
      'SELECT * FROM property_images WHERE id = $1 AND property_id = $2',
      [imageId, propertyId]
    );

    if (imageResult.rows.length === 0) {
      throw new AppError('Image not found', 404);
    }

    const image = imageResult.rows[0];
    const imageUrl = image.image_url;

    // Delete the file from filesystem
    const fs = require('fs');
    const path = require('path');
    
    // Extract filename from image_url (could be /uploads/images/filename.jpg or just filename.jpg)
    let filename = imageUrl;
    if (imageUrl.includes('/')) {
      filename = path.basename(imageUrl);
    }

    // Get upload directory
    const uploadDir = process.env.UPLOAD_DIR || 
      (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads') : './uploads');
    const resolvedUploadDir = path.resolve(uploadDir);
    const imagesDir = path.join(resolvedUploadDir, 'images');
    const imagePath = path.join(imagesDir, filename);

    // Delete file if it exists
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
        console.log(`✅ Deleted image file: ${imagePath}`);
      } catch (fileError: any) {
        console.warn(`⚠️  Failed to delete image file: ${imagePath}`, fileError.message);
        // Continue even if file deletion fails
      }
    }

    // Delete image record from database
    await query('DELETE FROM property_images WHERE id = $1', [imageId]);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

