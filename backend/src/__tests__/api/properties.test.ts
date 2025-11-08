import request from 'supertest';
import app from '../../index';
import { createTestUser, createTestOwner, createTestProperty, cleanupTestData } from '../helpers';

describe('Properties API', () => {
  let ownerUser: any;
  let ownerId: string;
  let authToken: string;

  beforeAll(async () => {
    await cleanupTestData();
    ownerUser = await createTestUser('owner');
    ownerId = await createTestOwner(ownerUser.id, 'management_company');

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: ownerUser.email,
        password: ownerUser.password,
      });
    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/properties', () => {
    it('should get all properties (public)', async () => {
      const response = await request(app)
        .get('/api/v1/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toBeDefined();
      expect(Array.isArray(response.body.data.properties)).toBe(true);
    });

    it('should filter properties by status', async () => {
      const response = await request(app)
        .get('/api/v1/properties?status=vacant')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter properties by type', async () => {
      const response = await request(app)
        .get('/api/v1/properties?type=apartment')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/properties', () => {
    it('should create a property with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          propertyName: 'Test Apartment',
          propertyType: 'apartment',
          category: 'residential',
          address: {
            emirate: 'Dubai',
            area: 'Downtown',
            location: 'Dubai Downtown',
            building_name: 'Test Building',
            apartment_no: '101',
          },
          description: 'A beautiful test apartment',
          price: 50000,
          features: ['parking', 'gym', 'pool'],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property).toBeDefined();
      expect(response.body.data.property.property_name).toBe('Test Apartment');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/properties')
        .send({
          propertyName: 'Test Property',
          propertyType: 'apartment',
          category: 'residential',
          address: {},
          price: 50000,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          propertyName: 'Test Property',
          // Missing propertyType, category, address, price
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/owner/properties', () => {
    it('should get owner properties with filters', async () => {
      // Create a property first
      await createTestProperty(ownerId);

      const response = await request(app)
        .get('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toBeDefined();
      expect(Array.isArray(response.body.data.properties)).toBe(true);
    });

    it('should filter by location', async () => {
      const response = await request(app)
        .get('/api/v1/owner/properties?location=Dubai Downtown')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/owner/properties?status=vacant')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/properties/:id', () => {
    let propertyId: string;

    beforeAll(async () => {
      propertyId = await createTestProperty(ownerId);
    });

    it('should get property by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/properties/${propertyId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property).toBeDefined();
      expect(response.body.data.property.id).toBe(propertyId);
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/properties/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

