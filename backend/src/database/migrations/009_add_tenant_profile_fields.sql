-- Add additional profile fields for tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB;


