import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as applicationController from '../controllers/application.controller';

const router = express.Router();

// Protected routes
router.post('/', authenticate, applicationController.createApplication);
router.get('/', authenticate, applicationController.getApplications);
router.get('/:id', authenticate, applicationController.getApplicationById);
router.put('/:id', authenticate, applicationController.updateApplication);
router.put('/:id/status', authenticate, applicationController.updateApplicationStatus);
router.delete('/:id', authenticate, applicationController.cancelApplication);

export default router;

