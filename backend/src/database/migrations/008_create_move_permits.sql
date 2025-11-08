-- Migration: 008_create_move_permits
-- Purpose: Track tenant move-in/move-out permits with UAE-required documentation

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'move_permits'
    ) THEN
        CREATE TABLE move_permits (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
            permit_type VARCHAR(20) NOT NULL CHECK (permit_type IN ('move_in', 'move_out')),
            status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
                'draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled', 'completed'
            )),
            requested_move_date DATE NOT NULL,
            time_window_start TIME,
            time_window_end TIME,
            emirates_id_front_url VARCHAR(500),
            emirates_id_back_url VARCHAR(500),
            passport_copy_url VARCHAR(500),
            visa_page_url VARCHAR(500),
            tenancy_contract_url VARCHAR(500),
            ejari_certificate_url VARCHAR(500),
            landlord_noc_url VARCHAR(500),
            movers_company_name VARCHAR(255),
            movers_trade_license_url VARCHAR(500),
            movers_noc_url VARCHAR(500),
            movers_contact_name VARCHAR(255),
            movers_contact_mobile VARCHAR(50),
            vehicle_details JSONB DEFAULT '[]'::jsonb,
            additional_documents JSONB DEFAULT '[]'::jsonb,
            special_instructions TEXT,
            submitted_at TIMESTAMP,
            reviewed_at TIMESTAMP,
            reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            review_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_move_permits_tenant ON move_permits(tenant_id);
        CREATE INDEX idx_move_permits_property ON move_permits(property_id);
        CREATE INDEX idx_move_permits_status ON move_permits(status);
        CREATE INDEX idx_move_permits_requested_date ON move_permits(requested_move_date);
    END IF;
END $$;

COMMENT ON TABLE move_permits IS 'Move-in and move-out permit applications submitted by tenants';
COMMENT ON COLUMN move_permits.vehicle_details IS 'Array of vehicle plate numbers and descriptions for the move';
COMMENT ON COLUMN move_permits.additional_documents IS 'Array of additional supporting documents (name, url)';

