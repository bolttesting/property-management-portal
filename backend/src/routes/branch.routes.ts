import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as branchController from '../controllers/branch.controller';

const router = express.Router();

// Public routes
router.get('/', branchController.getBranches);
router.get('/:id', branchController.getBranchById);

// Admin routes
router.post('/', authenticate, branchController.createBranch);
router.put('/:id', authenticate, branchController.updateBranch);
router.delete('/:id', authenticate, branchController.deleteBranch);

export default router;

