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

// Security middleware
// Configure helmet to allow cross-origin resources for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// CORS configuration
const rawFrontendOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawFrontendOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
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
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Serving static files from:', uploadsPath);
console.log('Static files will be available at: http://localhost:5000/uploads/...');

// Serve static files with proper CORS headers
// IMPORTANT: This must come BEFORE the general CORS middleware to ensure proper headers
app.use('/uploads', (req, res, next) => {
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for static files
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
    res.sendStatus(200);
    return;
  }
  // Set CORS headers for static files - allow all origins for images
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for static files
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
    // Log static file requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Serving static file: ${filePath}`);
    }
  }
}));

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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

