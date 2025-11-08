-- Add listing_type field to properties table to distinguish between rent and sale
-- Migration: 003_add_listing_type

-- Add listing_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'listing_type'
    ) THEN
        ALTER TABLE properties 
        ADD COLUMN listing_type VARCHAR(20) NOT NULL DEFAULT 'rent' 
        CHECK (listing_type IN ('rent', 'sale'));
        
        -- Create index for faster filtering
        CREATE INDEX idx_properties_listing_type ON properties(listing_type);
        
        -- Update comment
        COMMENT ON COLUMN properties.listing_type IS 'Type of listing: rent or sale';
    END IF;
END $$;

