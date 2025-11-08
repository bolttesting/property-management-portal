import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as uploadController from '../controllers/upload.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload routes - multer handles multipart/form-data
router.post('/image', uploadController.uploadImage);
router.post('/document', uploadController.uploadDocument);
router.delete('/:fileId', uploadController.deleteFile);

export default router;

