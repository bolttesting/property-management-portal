-- Add offer_amount field to applications table
-- Migration: 005_add_offer_amount

-- Add offer_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'offer_amount'
    ) THEN
        ALTER TABLE applications 
        ADD COLUMN offer_amount DECIMAL(10, 2);
        
        -- Add comment
        COMMENT ON COLUMN applications.offer_amount IS 'Tenant offer amount against the asking price';
    END IF;
END $$;

