import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as leaseController from '../controllers/lease.controller';

const router = express.Router();

// All routes require authentication
router.post('/', authenticate, leaseController.createLease);
router.get('/', authenticate, leaseController.getLeases);
router.get('/:id', authenticate, leaseController.getLeaseById);
router.put('/:id', authenticate, leaseController.updateLease);
router.put('/:id/renew', authenticate, leaseController.renewLease);
router.put('/:id/terminate', authenticate, leaseController.terminateLease);

export default router;

