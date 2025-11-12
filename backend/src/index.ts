import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from './database/connection';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.routes';
import propertyRoutes from './routes/property.routes';
import applicationRoutes from './routes/application.routes';
import tenantRoutes from './routes/tenant.routes';
import ownerRoutes from './routes/owner.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import leaseRoutes from './routes/lease.routes';
import notificationRoutes from './routes/notification.routes';
import rentPaymentRoutes from './routes/rentPayment.routes';
import reviewRoutes from './routes/review.routes';
import complaintRoutes from './routes/complaint.routes';
import viewingRoutes from './routes/viewing.routes';
import managementPlanRoutes from './routes/managementPlan.routes';
import branchRoutes from './routes/branch.routes';
import adminStaffRoutes from './routes/adminStaff.routes';
import blogRoutes from './routes/blog.routes';
import chatRoutes from './routes/chat.routes';
import contactRoutes from './routes/contact.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Behind Railway/Vercel proxies
app.set('trust proxy', 1);

// Security middleware
// Configure helmet to allow cross-origin resources for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
// Compression middleware - skip images for iOS Safari compatibility
app.use(compression({
  filter: (req, res) => {
    // Don't compress images (iOS Safari can have issues)
    if (req.path && /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(req.path)) {
      return false;
    }
    // Use default compression filter for other files
    return compression.filter(req, res);
  }
}));

// CORS configuration
const rawFrontendOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawFrontendOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (origin === 'null') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  optionsSuccessStatus: 200
}));

// Rate limiting - More lenient for development
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute (reduced from 15 minutes)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per minute (increased for dev)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development mode
    return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

// More lenient rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '50'), // 50 login attempts per minute (increased)
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development mode
    return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

// Apply rate limiting only if not disabled
const disableRateLimit = process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';

if (!disableRateLimit) {
  // Auth limiter first (more specific), then general
  app.use(`/api/${API_VERSION}/auth`, authLimiter);
  app.use('/api/', generalLimiter);
  console.log('✅ Rate limiting enabled (Auth: 50/min, General: 1000/min)');
} else {
  console.log('⚠️  Rate limiting DISABLED for development');
}

// Serve static files (uploaded images and documents)
// This must come BEFORE body parsers to avoid conflicts
// Use Railway Volume if available, otherwise use local storage
const uploadDir = process.env.UPLOAD_DIR || 
  (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads') : './uploads');
const uploadsPath = path.resolve(uploadDir);
console.log('📁 Serving static files from:', uploadsPath);
console.log('🌐 Static files will be available at: /uploads/...');
console.log('💾 Railway Volume:', process.env.RAILWAY_VOLUME_MOUNT_PATH || 'Not configured (ephemeral storage)');

// Serve static files with proper CORS headers
// IMPORTANT: This must come BEFORE the general CORS middleware to ensure proper headers
app.use('/uploads', (req, res, next) => {
  // Skip compression for images (iOS Safari can have issues with compressed images)
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(req.path);
  if (isImage) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    res.setHeader('Accept-Ranges', 'bytes'); // Important for iOS Safari
  }
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for static files
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');
    res.sendStatus(200);
    return;
  }
  // Set CORS headers for static files - allow all origins for images
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for static files
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  fallthrough: false, // Don't continue to next middleware if file not found
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    // Important headers for iOS Safari
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Log static file requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Serving static file: ${filePath}`);
    }
  }
}));

// Handle 404 for missing images - return a proper 404 response
app.use('/uploads', (req, res) => {
  // Only handle image requests that failed
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(req.path)) {
    console.warn(`⚠️  Image not found: ${req.path}`);
    res.status(404).json({
      error: 'Image not found',
      message: 'The requested image file does not exist. It may have been deleted or the storage volume may not be configured.',
      path: req.path
    });
  } else {
    res.status(404).json({ error: 'File not found', path: req.path });
  }
});

// Body parsing middleware - Skip for upload routes (multer needs raw multipart/form-data)
// Only parse JSON/URL-encoded for non-upload routes
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '10mb' });

app.use((req, res, next) => {
  // Skip body parsing for upload routes - multer will handle it
  const isUploadRoute = req.path.includes('/upload/');
  if (isUploadRoute) {
    console.log('Skipping body parser for upload route:', req.path);
    return next();
  }
  // Parse JSON for other routes
  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  // Skip body parsing for upload routes
  const isUploadRoute = req.path.includes('/upload/');
  if (isUploadRoute) {
    return next();
  }
  // Parse URL-encoded for other routes
  urlencodedParser(req, res, next);
});

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/properties`, propertyRoutes);
app.use(`/api/${API_VERSION}/applications`, applicationRoutes);
app.use(`/api/${API_VERSION}/leases`, leaseRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/rent-payments`, rentPaymentRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/complaints`, complaintRoutes);
app.use(`/api/${API_VERSION}/viewings`, viewingRoutes);
app.use(`/api/${API_VERSION}/management-plans`, managementPlanRoutes);
app.use(`/api/${API_VERSION}/branches`, branchRoutes);
app.use(`/api/${API_VERSION}/admin/staff`, adminStaffRoutes);
app.use(`/api/${API_VERSION}/blog`, blogRoutes);
app.use(`/api/${API_VERSION}/chat`, chatRoutes);
app.use(`/api/${API_VERSION}/tenant`, tenantRoutes);
app.use(`/api/${API_VERSION}/owner`, ownerRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadRoutes);
app.use(`/api/${API_VERSION}/contact`, contactRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const fs = require('fs');
  const uploadDir = process.env.UPLOAD_DIR || 
    (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads') : './uploads');
  const resolvedUploadDir = path.resolve(uploadDir);
  const imagesDir = path.join(resolvedUploadDir, 'images');
  
  const storageInfo = {
    uploadDir: resolvedUploadDir,
    imagesDir: imagesDir,
    exists: fs.existsSync(resolvedUploadDir),
    writable: false,
    railwayVolume: process.env.RAILWAY_VOLUME_MOUNT_PATH || null,
    uploadDirEnv: process.env.UPLOAD_DIR || null
  };
  
  try {
    // Check if directory is writable
    fs.accessSync(resolvedUploadDir, fs.constants.W_OK);
    storageInfo.writable = true;
  } catch (error) {
    storageInfo.writable = false;
  }
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: storageInfo,
    database: 'connected' // You can enhance this to check DB connection
  });
});

// Debug: Log all registered routes
if (process.env.NODE_ENV === 'development') {
  console.log('\n📋 Registered API Routes:');
  console.log(`  GET  /api/${API_VERSION}/owner/tenants/:id - Get tenant by ID`);
  console.log(`  PUT  /api/${API_VERSION}/owner/tenants/:id - Update tenant`);
  console.log(`  GET  /api/${API_VERSION}/owner/tenants - Get all tenants`);
  console.log(`  POST /api/${API_VERSION}/owner/tenants - Create tenant\n`);
}

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

