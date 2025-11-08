import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

// Public routes
router.post('/register/tenant', authController.registerTenant);
router.post('/register/owner', authController.registerOwner);
router.post('/login', authController.login);
router.post('/login/mobile', authController.loginWithMobile);
router.post('/otp/send', authController.sendOTP);
router.post('/otp/verify', authController.verifyOTP);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

export default router;

