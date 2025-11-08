import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as blogController from '../controllers/blog.controller';

const router = express.Router();

// Public routes
router.get('/', blogController.getBlogPosts);
router.get('/:id', blogController.getBlogPostById);

// Admin routes
router.post('/', authenticate, blogController.createBlogPost);
router.put('/:id', authenticate, blogController.updateBlogPost);
router.delete('/:id', authenticate, blogController.deleteBlogPost);

export default router;

