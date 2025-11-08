import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler';

// Ensure upload directory exists
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
const imagesDir = path.join(uploadDir, 'images');
const documentsDir = path.join(uploadDir, 'documents');

[uploadDir, imagesDir, documentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created upload directory: ${dir}`);
  }
});

console.log(`Upload directories configured:
  - Images: ${imagesDir}
  - Documents: ${documentsDir}`);

// Configure multer for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Configure multer for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for images
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
};

// File filter for documents
const documentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only document files are allowed (pdf, doc, docx)'));
  }
};

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  fileFilter: imageFilter,
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  fileFilter: documentFilter,
});

// Upload Image
export const uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('=== Upload Image Request ===');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Method:', req.method);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('Files:', req.files);
  console.log('File:', req.file);
  
  const upload = imageUpload.single('image');
  
  upload(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      console.error('Error type:', err.constructor.name);
      if (err instanceof multer.MulterError) {
        console.error('Multer error code:', err.code);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File too large. Maximum size is 10MB', 400));
        }
        return next(new AppError(`Upload error: ${err.message}`, 400));
      }
      return next(new AppError(err.message || 'File upload failed', 400));
    }

    console.log('After multer processing:');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);

    if (!req.file) {
      console.error('No file received. Request details:', {
        headers: req.headers,
        body: req.body,
        files: (req as any).files
      });
      return next(new AppError('No file uploaded. Please select an image file.', 400));
    }

    const fileUrl = `/uploads/images/${req.file.filename}`;
    console.log('File uploaded successfully:', fileUrl);
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        fileUrl,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  });
};

// Upload Document
export const uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const upload = documentUpload.single('document');
  
  upload(req, res, (err) => {
    if (err) {
      return next(new AppError(err.message, 400));
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        fileUrl,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  });
};

// Delete File
export const deleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      throw new AppError('File ID is required', 400);
    }

    // Extract filename from fileId (could be just filename or full path like /uploads/images/filename.jpg)
    let filename = fileId;
    if (fileId.includes('/')) {
      // Extract just the filename from path
      filename = path.basename(fileId);
    }

    // Try to find and delete the file from images directory
    const imagePath = path.join(imagesDir, filename);
    let fileDeleted = false;
    let deletedPath = '';

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      fileDeleted = true;
      deletedPath = imagePath;
    } else {
      // Try documents directory
      const documentPath = path.join(documentsDir, filename);
      if (fs.existsSync(documentPath)) {
        fs.unlinkSync(documentPath);
        fileDeleted = true;
        deletedPath = documentPath;
      }
    }

    if (!fileDeleted) {
      throw new AppError('File not found', 404);
    }

    // Optionally: Check and remove references from database
    // This is a cleanup step - remove file references from property_images, application_documents, etc.
    try {
      const { query } = await import('../database/connection');
      
      // Remove from property_images if exists
      await query(
        'DELETE FROM property_images WHERE image_url LIKE $1',
        [`%${filename}%`]
      );
      
      // Note: If you have application_documents or other tables that reference files,
      // add similar cleanup queries here
    } catch (dbError) {
      // Log but don't fail if database cleanup fails
      console.warn('Database cleanup warning:', dbError);
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: {
        filename,
        deletedPath,
      },
    });
  } catch (error) {
    next(error);
  }
};

