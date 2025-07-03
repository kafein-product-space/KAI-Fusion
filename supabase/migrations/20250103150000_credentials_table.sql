-- Create credentials table for secure API key storage
CREATE TABLE IF NOT EXISTS credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(50) NOT NULL,
    encrypted_data TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_service_type ON credentials(service_type);
CREATE INDEX IF NOT EXISTS idx_credentials_user_service ON credentials(user_id, service_type);

-- Enable Row Level Security
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own credentials" ON credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own credentials" ON credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials" ON credentials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" ON credentials
    FOR DELETE USING (auth.uid() = user_id); 