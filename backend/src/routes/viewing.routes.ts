import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as viewingController from '../controllers/viewing.controller';

const router = express.Router();

// All routes require authentication
router.post('/', authenticate, viewingController.createViewing);
router.get('/', authenticate, viewingController.getViewings);
router.get('/:id', authenticate, viewingController.getViewingById);
router.put('/:id/status', authenticate, viewingController.updateViewingStatus);
router.put('/:id/cancel', authenticate, viewingController.cancelViewing);

export default router;

