-- Initial Schema for Flowise-FastAPI
-- Migration: 20250103120000_initial_schema
-- Description: Set up core tables, indexes, and RLS policies

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
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
CREATE TABLE IF NOT EXISTS executions (
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
CREATE TABLE IF NOT EXISTS custom_nodes (
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

-- Create triggers for updated_at columns
CREATE TRIGGER update_workflows_updated_at 
    BEFORE UPDATE ON workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_nodes_updated_at 
    BEFORE UPDATE ON custom_nodes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_public ON workflows(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_nodes_user_id ON custom_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_nodes_category ON custom_nodes(category);
CREATE INDEX IF NOT EXISTS idx_custom_nodes_is_public ON custom_nodes(is_public) WHERE is_public = true;

-- Enable Row Level Security
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_nodes ENABLE ROW LEVEL SECURITY;

-- Workflow RLS Policies
CREATE POLICY "workflow_select_policy" ON workflows
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_public = true
    );

CREATE POLICY "workflow_insert_policy" ON workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workflow_update_policy" ON workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "workflow_delete_policy" ON workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Execution RLS Policies
CREATE POLICY "execution_select_policy" ON executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "execution_insert_policy" ON executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "execution_update_policy" ON executions
    FOR UPDATE USING (auth.uid() = user_id);

-- Custom Nodes RLS Policies
CREATE POLICY "custom_nodes_select_policy" ON custom_nodes
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_public = true
    );

CREATE POLICY "custom_nodes_insert_policy" ON custom_nodes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "custom_nodes_update_policy" ON custom_nodes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "custom_nodes_delete_policy" ON custom_nodes
    FOR DELETE USING (auth.uid() = user_id); 