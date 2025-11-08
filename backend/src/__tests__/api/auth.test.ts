import request from 'supertest';
import app from '../../index';
import { createTestUser, createTestOwner, cleanupTestData } from '../helpers';

describe('Auth API', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/auth/register/tenant', () => {
    it('should register a new tenant', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/tenant')
        .send({
          email: `test_tenant_${Date.now()}@test.com`,
          mobile: `+971501234${Date.now()}`,
          password: 'Test123456!',
          fullName: 'Test Tenant',
          nationality: 'UAE',
          employmentStatus: 'employed',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.userType).toBe('tenant');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/tenant')
        .send({
          email: 'invalid-email',
          password: 'Test123456!',
          fullName: 'Test Tenant',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/tenant')
        .send({
          email: `test_tenant_${Date.now()}@test.com`,
          password: '123',
          fullName: 'Test Tenant',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register/owner', () => {
    it('should register a new property dealer', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/owner')
        .send({
          email: `test_dealer_${Date.now()}@test.com`,
          mobile: `+971501234${Date.now()}`,
          password: 'Test123456!',
          firstName: 'Test',
          lastName: 'Dealer',
          ownerType: 'management_company',
          companyName: 'Test Property Management',
          tradeLicenseNumber: 'TL123456',
          serviceAreas: ['Dubai', 'Abu Dhabi'],
          propertyTypes: ['apartment', 'villa'],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('submitted successfully');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/owner')
        .send({
          email: `test_dealer_${Date.now()}@test.com`,
          password: 'Test123456!',
          // Missing firstName, lastName, ownerType
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await createTestUser('tenant');
    });

    it('should login with email and password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Test123456!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser: any;
    let authToken: string;

    beforeAll(async () => {
      testUser = await createTestUser('tenant');
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      authToken = loginResponse.body.data.token;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

