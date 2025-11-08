import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as adminStaffController from '../controllers/adminStaff.controller';

const router = express.Router();

// All routes require authentication and super admin role
router.post('/', authenticate, adminStaffController.createAdminStaff);
router.get('/', authenticate, adminStaffController.getAdminStaff);
router.get('/:id', authenticate, adminStaffController.getAdminStaffById);
router.put('/:id', authenticate, adminStaffController.updateAdminStaff);
router.delete('/:id', authenticate, adminStaffController.deleteAdminStaff);

export default router;

