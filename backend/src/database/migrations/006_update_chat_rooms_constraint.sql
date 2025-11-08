-- Update chat_rooms room_type constraint to include 'owner_tenant'
-- Migration: 006_update_chat_rooms_constraint

DO $$
BEGIN
    -- Drop the existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_rooms_room_type_check' 
        AND table_name = 'chat_rooms'
    ) THEN
        ALTER TABLE chat_rooms DROP CONSTRAINT chat_rooms_room_type_check;
    END IF;
    
    -- Add the new constraint with both 'tenant_owner' and 'owner_tenant'
    ALTER TABLE chat_rooms 
    ADD CONSTRAINT chat_rooms_room_type_check 
    CHECK (room_type IN ('tenant_owner', 'owner_tenant', 'tenant_admin', 'owner_admin', 'support'));
END $$;

