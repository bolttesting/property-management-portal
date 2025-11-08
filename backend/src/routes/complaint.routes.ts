import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as complaintController from '../controllers/complaint.controller';

const router = express.Router();

// All routes require authentication
router.post('/', authenticate, complaintController.createComplaint);
router.get('/', authenticate, complaintController.getComplaints);
router.get('/:id', authenticate, complaintController.getComplaintById);
router.put('/:id/status', authenticate, complaintController.updateComplaintStatus);

export default router;

