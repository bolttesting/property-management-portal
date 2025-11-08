import { Router } from 'express';
import {
  submitContactForm,
  getAllContactMessages,
  getContactMessage,
  markMessageAsRead,
  updateMessageStatus,
  deleteContactMessage,
} from '../controllers/contact.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public route - submit contact form
router.post('/submit', submitContactForm);

// Admin routes - require authentication and admin role
router.get('/messages', authenticate, authorize('admin'), getAllContactMessages);
router.get('/messages/:id', authenticate, authorize('admin'), getContactMessage);
router.patch('/messages/:id/read', authenticate, authorize('admin'), markMessageAsRead);
router.patch('/messages/:id/status', authenticate, authorize('admin'), updateMessageStatus);
router.delete('/messages/:id', authenticate, authorize('admin'), deleteContactMessage);

export default router;

