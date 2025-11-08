import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', adminController.updateUserStatus);

// Owner Management
router.get('/owners', adminController.getOwners);
router.get('/owners/pending', adminController.getPendingOwners);
router.put('/owners/:id/approve', adminController.approveOwner);
router.put('/owners/:id/reject', adminController.rejectOwner);

// Property Management
router.get('/properties', adminController.getAllProperties);
router.get('/properties/:id', adminController.getPropertyById);
router.put('/properties/:id/status', adminController.updatePropertyStatus);

// Application Management
router.get('/applications', adminController.getAllApplications);
router.get('/applications/:id', adminController.getApplicationById);

// Tenant Management
router.get('/tenants', adminController.getAllTenants);

// Reports
router.get('/reports/financial', adminController.getFinancialReports);
router.get('/reports/properties', adminController.getPropertyReports);

export default router;

