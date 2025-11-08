import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as ownerController from '../controllers/owner.controller';
import * as movePermitController from '../controllers/movePermit.controller';

const router = express.Router();

// All routes require authentication and owner role
router.use(authenticate);
router.use(authorize('owner'));

router.get('/dashboard', ownerController.getDashboard);
router.get('/profile', ownerController.getProfile);
router.put('/profile', ownerController.updateProfile);
router.get('/properties', ownerController.getProperties);
router.get('/applications', ownerController.getApplications);
router.get('/leases', ownerController.getLeases);
router.put('/leases/:id/contract', ownerController.updateLeaseContract);
router.get('/financials', ownerController.getFinancials);
router.get('/notifications', ownerController.getNotifications);
// Tenant routes - order matters: specific routes before parameterized routes
router.post('/tenants', ownerController.createTenant);
router.get('/tenants/:id', ownerController.getTenantById); // Must come before /tenants to avoid conflicts
router.put('/tenants/:id', ownerController.updateTenant);
router.get('/tenants', ownerController.getTenants); // General route last
router.get('/maintenance-requests', ownerController.getMaintenanceRequests);
router.put('/maintenance-requests/:id', ownerController.updateMaintenanceRequest);
router.get('/move-permits', movePermitController.getOwnerMovePermits);
router.put('/move-permits/:id/status', movePermitController.updateOwnerMovePermitStatus);

export default router;

