import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query } from '../database/connection';

export interface TestUser {
  id: string;
  email: string;
  mobile: string;
  password: string;
  userType: 'tenant' | 'owner' | 'admin';
}

export async function createTestUser(
  userType: 'tenant' | 'owner' | 'admin',
  email?: string,
  mobile?: string
): Promise<TestUser> {
  const userId = uuidv4();
  const testEmail = email || `test_${userType}_${Date.now()}@test.com`;
  const testMobile = mobile || `+971501234${Math.floor(Math.random() * 1000)}`;
  const password = 'Test123456!';
  const passwordHash = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO users (id, email, mobile, password_hash, user_type, status, email_verified, mobile_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, testEmail, testMobile, passwordHash, userType, 'active', true, true]
  );

  return {
    id: userId,
    email: testEmail,
    mobile: testMobile,
    password,
    userType,
  };
}

export async function createTestOwner(userId: string, ownerType: string = 'management_company'): Promise<string> {
  const ownerId = uuidv4();
  await query(
    `INSERT INTO owners (id, user_id, first_name, last_name, owner_type, company_name, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ownerId, userId, 'Test', 'Owner', ownerType, 'Test Company', 'active']
  );
  return ownerId;
}

export async function createTestTenant(userId: string, ownerId?: string): Promise<string> {
  const tenantId = uuidv4();
  await query(
    `INSERT INTO tenants (id, user_id, owner_id, full_name, registration_source)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenantId, userId, ownerId || null, 'Test Tenant', 'email']
  );
  return tenantId;
}

export async function createTestProperty(ownerId: string): Promise<string> {
  const propertyId = uuidv4();
  await query(
    `INSERT INTO properties (id, owner_id, property_name, property_type, category, address, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      propertyId,
      ownerId,
      'Test Property',
      'apartment',
      'residential',
      JSON.stringify({
        emirate: 'Dubai',
        area: 'Downtown',
        location: 'Dubai Downtown',
        building_name: 'Test Building',
        apartment_no: '101',
      }),
      50000,
      'vacant',
    ]
  );
  return propertyId;
}

export async function cleanupTestData(): Promise<void> {
  // Clean up test data in reverse order of dependencies
  await query('DELETE FROM notifications WHERE user_id LIKE $1', ['test_%']);
  await query('DELETE FROM maintenance_request_photos WHERE maintenance_request_id IN (SELECT id FROM maintenance_requests WHERE property_id IN (SELECT id FROM properties WHERE owner_id IN (SELECT id FROM owners WHERE company_name = $1)))', ['Test Company']);
  await query('DELETE FROM maintenance_requests WHERE property_id IN (SELECT id FROM properties WHERE owner_id IN (SELECT id FROM owners WHERE company_name = $1))', ['Test Company']);
  await query('DELETE FROM application_documents WHERE application_id IN (SELECT id FROM applications WHERE tenant_id IN (SELECT id FROM tenants WHERE full_name = $1))', ['Test Tenant']);
  await query('DELETE FROM applications WHERE tenant_id IN (SELECT id FROM tenants WHERE full_name = $1)', ['Test Tenant']);
  await query('DELETE FROM leases WHERE tenant_id IN (SELECT id FROM tenants WHERE full_name = $1)', ['Test Tenant']);
  await query('DELETE FROM property_favorites WHERE property_id IN (SELECT id FROM properties WHERE owner_id IN (SELECT id FROM owners WHERE company_name = $1))', ['Test Company']);
  await query('DELETE FROM property_images WHERE property_id IN (SELECT id FROM properties WHERE owner_id IN (SELECT id FROM owners WHERE company_name = $1))', ['Test Company']);
  await query('DELETE FROM properties WHERE owner_id IN (SELECT id FROM owners WHERE company_name = $1)', ['Test Company']);
  await query('DELETE FROM tenants WHERE full_name = $1', ['Test Tenant']);
  await query('DELETE FROM owners WHERE company_name = $1', ['Test Company']);
  await query('DELETE FROM users WHERE email LIKE $1', ['test_%']);
}

