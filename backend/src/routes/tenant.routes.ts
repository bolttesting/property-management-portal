import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as tenantController from '../controllers/tenant.controller';
import * as movePermitController from '../controllers/movePermit.controller';

const router = express.Router();

// All routes require authentication and tenant role
router.use(authenticate);
router.use(authorize('tenant'));

router.get('/dashboard', tenantController.getDashboard);
router.get('/profile', tenantController.getProfile);
router.put('/profile', tenantController.updateProfile);
router.get('/applications', tenantController.getApplications);
router.get('/leases', tenantController.getLeases);
router.get('/maintenance-requests', tenantController.getMaintenanceRequests);
router.post('/maintenance-requests', tenantController.createMaintenanceRequest);
router.get('/notifications', tenantController.getNotifications);
router.get('/move-permits', movePermitController.getTenantMovePermits);
router.post('/move-permits', movePermitController.createTenantMovePermit);
router.get('/move-permits/:id', movePermitController.getTenantMovePermitById);
router.put('/move-permits/:id/cancel', movePermitController.cancelTenantMovePermit);

export default router;

