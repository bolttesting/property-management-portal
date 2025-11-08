import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as chatController from '../controllers/chat.controller';

const router = express.Router();

// All routes require authentication
router.post('/rooms', authenticate, chatController.getOrCreateChatRoom);
router.get('/rooms', authenticate, chatController.getChatRooms);
router.get('/rooms/:roomId/messages', authenticate, chatController.getChatMessages);
router.post('/messages', authenticate, chatController.sendMessage);
router.put('/rooms/:roomId/read', authenticate, chatController.markMessagesAsRead);
router.get('/unread-count', authenticate, chatController.getUnreadCount);

export default router;

