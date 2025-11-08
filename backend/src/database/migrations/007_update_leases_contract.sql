-- Migration: 007_update_leases_contract

DO $$
BEGIN
    -- Add contract and payment schedule fields to leases table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leases' AND column_name = 'contract_document_url'
    ) THEN
        ALTER TABLE leases
        ADD COLUMN contract_document_url VARCHAR(500),
        ADD COLUMN contract_uploaded_at TIMESTAMP,
        ADD COLUMN contract_uploaded_by UUID REFERENCES users(id),
        ADD COLUMN cheque_count INTEGER CHECK (cheque_count IN (1, 2, 4, 12)),
        ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cheque' CHECK (payment_method IN ('cheque', 'bank_transfer', 'cash', 'other')),
        ADD COLUMN payment_plan JSONB;
    END IF;

    -- Add additional metadata to rent_payments table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rent_payments' AND column_name = 'installment_number'
    ) THEN
        ALTER TABLE rent_payments
        ADD COLUMN installment_number INTEGER,
        ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE,
        ADD COLUMN reminder_sent_at TIMESTAMP,
        ADD COLUMN reminder_lead_days INTEGER DEFAULT 3;
    END IF;
END $$;

COMMENT ON COLUMN leases.contract_document_url IS 'Uploaded lease contract document accessible to both tenant and owner';
COMMENT ON COLUMN leases.cheque_count IS 'Number of rent cheques/instalments for the lease (1,2,4,12)';
COMMENT ON COLUMN leases.payment_plan IS 'Cached summary of the generated rent payment schedule';


