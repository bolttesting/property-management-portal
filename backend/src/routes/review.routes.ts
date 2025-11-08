import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as reviewController from '../controllers/review.controller';

const router = express.Router();

// Public routes
router.get('/property/:propertyId', reviewController.getPropertyReviews);
router.get('/:id', reviewController.getReviewById);

// Protected routes
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.put('/:id/approve', authenticate, reviewController.approveReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

export default router;

