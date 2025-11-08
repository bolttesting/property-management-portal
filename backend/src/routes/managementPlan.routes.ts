import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as managementPlanController from '../controllers/managementPlan.controller';

const router = express.Router();

// Public routes
router.get('/', managementPlanController.getManagementPlans);
router.get('/:id', managementPlanController.getManagementPlanById);

// Admin routes
router.post('/', authenticate, managementPlanController.createManagementPlan);
router.put('/:id', authenticate, managementPlanController.updateManagementPlan);
router.delete('/:id', authenticate, managementPlanController.deleteManagementPlan);

export default router;

