-- Users table is managed by Supabase Auth

-- Workflows table
CREATE TABLE workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    flow_data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executions table
CREATE TABLE executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    inputs JSONB,
    outputs JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom nodes table
CREATE TABLE custom_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    config JSONB NOT NULL,
    code TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX idx_executions_user_id ON executions(user_id);
CREATE INDEX idx_custom_nodes_user_id ON custom_nodes(user_id);

-- RLS Policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_nodes ENABLE ROW LEVEL SECURITY;

-- Workflow policies
CREATE POLICY "Users can view own workflows" ON workflows
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own workflows" ON workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Execution policies
CREATE POLICY "Users can view own executions" ON executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own executions" ON executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Custom nodes policies
CREATE POLICY "Users can view own and public nodes" ON custom_nodes
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own nodes" ON custom_nodes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nodes" ON custom_nodes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nodes" ON custom_nodes
    FOR DELETE USING (auth.uid() = user_id);