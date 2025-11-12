import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as propertyController from '../controllers/property.controller';

const router = express.Router();

// Public routes
router.get('/', propertyController.getAllProperties);
router.get('/search', propertyController.searchProperties);
router.get('/:id', propertyController.getPropertyById);
router.get('/:id/images', propertyController.getPropertyImages);

// Protected routes (require authentication)
router.post('/', authenticate, propertyController.createProperty);
router.put('/:id', authenticate, propertyController.updateProperty);
router.delete('/:id', authenticate, propertyController.deleteProperty);
router.post('/:id/images', authenticate, propertyController.addPropertyImages);
router.delete('/:id/images/:imageId', authenticate, propertyController.deletePropertyImage);
router.post('/:id/favorite', authenticate, propertyController.addToFavorites);
router.delete('/:id/favorite', authenticate, propertyController.removeFromFavorites);
router.get('/favorites/list', authenticate, propertyController.getFavoriteProperties);

export default router;

