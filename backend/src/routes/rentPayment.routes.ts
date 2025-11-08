import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as rentPaymentController from '../controllers/rentPayment.controller';

const router = express.Router();

// All routes require authentication
router.post('/', authenticate, rentPaymentController.createRentPayment);
router.get('/', authenticate, rentPaymentController.getRentPayments);
router.get('/history', authenticate, rentPaymentController.getPaymentHistory);
router.get('/:id', authenticate, rentPaymentController.getRentPaymentById);
router.put('/:id/status', authenticate, rentPaymentController.updateRentPaymentStatus);

export default router;

