-- Additional tables for rent payments, reviews, complaints, scheduled viewings

-- Rent Payments table
CREATE TABLE IF NOT EXISTS rent_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('debit_card', 'credit_card', 'bank_transfer', 'cheque', 'cash', 'other')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'partial', 'cancelled')),
    transaction_reference VARCHAR(255),
    receipt_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rent_payments_lease_id ON rent_payments(lease_id);
CREATE INDEX idx_rent_payments_tenant_id ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_owner_id ON rent_payments(owner_id);
CREATE INDEX idx_rent_payments_payment_status ON rent_payments(payment_status);
CREATE INDEX idx_rent_payments_due_date ON rent_payments(due_date);

-- Property Reviews table
CREATE TABLE IF NOT EXISTS property_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_reviews_property_id ON property_reviews(property_id);
CREATE INDEX idx_property_reviews_tenant_id ON property_reviews(tenant_id);
CREATE INDEX idx_property_reviews_rating ON property_reviews(rating);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('tenant', 'owner')),
    related_to VARCHAR(50) CHECK (related_to IN ('property', 'lease', 'maintenance', 'payment', 'service', 'other')),
    related_id UUID, -- Can reference property_id, lease_id, etc.
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);

-- Scheduled Viewings table (separate from applications)
CREATE TABLE IF NOT EXISTS scheduled_viewings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    applicant_name VARCHAR(255),
    applicant_email VARCHAR(255),
    applicant_mobile VARCHAR(20),
    viewing_date TIMESTAMP NOT NULL,
    viewing_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_viewings_property_id ON scheduled_viewings(property_id);
CREATE INDEX idx_scheduled_viewings_tenant_id ON scheduled_viewings(tenant_id);
CREATE INDEX idx_scheduled_viewings_viewing_date ON scheduled_viewings(viewing_date);
CREATE INDEX idx_scheduled_viewings_status ON scheduled_viewings(status);

-- Blog Posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url VARCHAR(500),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100),
    tags TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('tenant', 'owner', 'admin')),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20) CHECK (recipient_type IN ('tenant', 'owner', 'admin')),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_chat_room_id ON chat_messages(chat_room_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Chat Rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('tenant_owner', 'owner_tenant', 'tenant_admin', 'owner_admin', 'support')),
    participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant1_type VARCHAR(20) NOT NULL CHECK (participant1_type IN ('tenant', 'owner', 'admin')),
    participant2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    participant2_type VARCHAR(20) CHECK (participant2_type IN ('tenant', 'owner', 'admin')),
    last_message_at TIMESTAMP,
    last_message_preview TEXT,
    unread_count_participant1 INTEGER DEFAULT 0,
    unread_count_participant2 INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant1_id, participant2_id, room_type)
);

CREATE INDEX idx_chat_rooms_participant1_id ON chat_rooms(participant1_id);
CREATE INDEX idx_chat_rooms_participant2_id ON chat_rooms(participant2_id);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at);

