-- ==============================================================
-- KAI-Fusion Database Schema Creation Script
-- Version: 1.0
-- PostgreSQL 14+
-- Production Ready Schema for Database Team
-- ==============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- Query statistics
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- Advanced indexing

-- ==============================================================
-- UTILITY FUNCTIONS
-- ==============================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate secure random tokens
CREATE OR REPLACE FUNCTION generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ language 'plpgsql';

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ language 'plpgsql';

-- ==============================================================
-- CORE TABLES
-- ==============================================================

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    credential TEXT,
    temp_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    active_workspace_id UUID,
    last_login TIMESTAMP WITH TIME ZONE,
    profile_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_valid CHECK (is_valid_email(email)),
    CONSTRAINT users_status_valid CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT users_role_valid CHECK (role IN ('admin', 'user', 'viewer', 'organization_admin', 'api_user')),
    CONSTRAINT users_full_name_length CHECK (char_length(full_name) >= 2 OR full_name IS NULL)
);

-- 2. ROLES TABLE
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    permissions TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT roles_name_valid CHECK (name ~ '^[a-z_]+$'),
    CONSTRAINT roles_name_length CHECK (char_length(name) >= 2)
);

-- 3. ORGANIZATIONS TABLE
CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    admin_user_id UUID,
    default_ws_id UUID,
    organization_type VARCHAR(100) DEFAULT 'standard',
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    storage_limit_gb INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT organization_name_length CHECK (char_length(name) >= 2),
    CONSTRAINT organization_type_valid CHECK (organization_type IN ('standard', 'enterprise', 'trial')),
    CONSTRAINT organization_plan_valid CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
    CONSTRAINT organization_storage_positive CHECK (storage_limit_gb > 0)
);

-- 4. ORGANIZATION_USER TABLE (Many-to-Many)
CREATE TABLE organization_user (
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    -- Primary Key
    PRIMARY KEY (organization_id, user_id),
    
    -- Constraints
    CONSTRAINT org_user_status_valid CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'))
);

-- 5. WORKFLOWS TABLE
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    flow_data JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100) DEFAULT 'General',
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    is_template BOOLEAN DEFAULT FALSE,
    template_source_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflows_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT workflows_version_positive CHECK (version > 0),
    CONSTRAINT workflows_flow_data_not_empty CHECK (flow_data != '{}'::jsonb),
    CONSTRAINT workflows_execution_count_positive CHECK (execution_count >= 0)
);

-- 6. WORKFLOW_TEMPLATES TABLE
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    flow_data JSONB NOT NULL,
    author_id UUID,
    is_official BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    preview_image_url TEXT,
    documentation_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_rating_range CHECK (rating >= 0.0 AND rating <= 5.0),
    CONSTRAINT template_download_count_positive CHECK (download_count >= 0),
    CONSTRAINT template_rating_count_positive CHECK (rating_count >= 0)
);

-- 7. WORKFLOW_EXECUTIONS TABLE
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    user_id UUID NOT NULL,
    organization_id UUID,
    session_id VARCHAR(255),
    execution_mode VARCHAR(20) DEFAULT 'manual',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inputs JSONB,
    outputs JSONB,
    intermediate_results JSONB,
    error_message TEXT,
    error_code VARCHAR(50),
    error_stack_trace TEXT,
    execution_time_ms INTEGER,
    node_count INTEGER,
    nodes_executed INTEGER DEFAULT 0,
    memory_usage_mb INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT exec_status_valid CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    CONSTRAINT exec_mode_valid CHECK (execution_mode IN ('manual', 'scheduled', 'api', 'webhook')),
    CONSTRAINT exec_time_positive CHECK (execution_time_ms >= 0),
    CONSTRAINT exec_node_count_positive CHECK (node_count >= 0),
    CONSTRAINT exec_nodes_executed_valid CHECK (nodes_executed >= 0 AND nodes_executed <= node_count),
    CONSTRAINT exec_memory_positive CHECK (memory_usage_mb >= 0)
);

-- 8. EXECUTION_CHECKPOINTS TABLE
CREATE TABLE execution_checkpoints (
    execution_id UUID PRIMARY KEY,
    checkpoint_data JSONB NOT NULL,
    parent_checkpoint_id UUID,
    step_number INTEGER DEFAULT 0,
    checkpoint_type VARCHAR(20) DEFAULT 'auto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT checkpoint_step_positive CHECK (step_number >= 0),
    CONSTRAINT checkpoint_type_valid CHECK (checkpoint_type IN ('auto', 'manual', 'error', 'milestone'))
);

-- 9. USER_CREDENTIALS TABLE
CREATE TABLE user_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    encrypted_secret TEXT NOT NULL,
    encryption_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_user_credential_name UNIQUE (user_id, name),
    
    -- Validation constraints
    CONSTRAINT credential_service_type_valid CHECK (
        service_type IN ('openai', 'anthropic', 'google', 'azure', 'aws', 'huggingface', 'cohere', 'custom')
    ),
    CONSTRAINT credential_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT credential_usage_count_positive CHECK (usage_count >= 0)
);

-- 10. LOGIN_METHOD TABLE
CREATE TABLE login_method (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    name VARCHAR(100) NOT NULL,
    method_type VARCHAR(50) NOT NULL DEFAULT 'password',
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'ENABLE',
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT login_method_status_valid CHECK (status IN ('ENABLE', 'DISABLE')),
    CONSTRAINT login_method_type_valid CHECK (
        method_type IN ('password', 'oauth', 'saml', 'ldap', 'sso', 'api_key')
    ),
    CONSTRAINT login_method_priority_range CHECK (priority >= 0 AND priority <= 100)
);

-- 11. LOGIN_ACTIVITY TABLE
CREATE TABLE login_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL,
    user_id UUID,
    activity_code INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    message VARCHAR(500) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    success BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0,
    geolocation JSONB,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT activity_type_valid CHECK (
        activity_type IN ('login', 'logout', 'failed_login', 'password_reset', 'account_locked', 'api_access')
    ),
    CONSTRAINT activity_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- 12. CHAT_MESSAGE TABLE
CREATE TABLE chat_message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(255) NOT NULL,
    chatflow_id UUID NOT NULL,
    session_id VARCHAR(255),
    user_id UUID,
    content TEXT NOT NULL,
    source_documents JSONB,
    metadata JSONB DEFAULT '{}',
    token_count INTEGER,
    response_time_ms INTEGER,
    model_used VARCHAR(100),
    cost_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chat_role_valid CHECK (role IN ('user', 'assistant', 'system', 'function', 'tool')),
    CONSTRAINT chat_content_not_empty CHECK (char_length(content) > 0),
    CONSTRAINT chat_token_count_positive CHECK (token_count >= 0),
    CONSTRAINT chat_response_time_positive CHECK (response_time_ms >= 0),
    CONSTRAINT chat_cost_positive CHECK (cost_cents >= 0)
);

-- 13. WORKFLOW_SHARING TABLE
CREATE TABLE workflow_sharing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    shared_by UUID NOT NULL,
    shared_with UUID,
    organization_id UUID,
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
    can_edit BOOLEAN DEFAULT FALSE,
    can_execute BOOLEAN DEFAULT TRUE,
    can_share BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT sharing_permission_valid CHECK (
        permission_level IN ('view', 'execute', 'edit', 'admin')
    ),
    CONSTRAINT sharing_target_check CHECK (
        (shared_with IS NOT NULL AND organization_id IS NULL) OR
        (shared_with IS NULL AND organization_id IS NOT NULL)
    ),
    CONSTRAINT sharing_access_count_positive CHECK (access_count >= 0)
);

-- 14. API_KEYS TABLE
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT api_key_rate_limit_hourly_positive CHECK (rate_limit_per_hour > 0),
    CONSTRAINT api_key_rate_limit_daily_positive CHECK (rate_limit_per_day > 0),
    CONSTRAINT api_key_usage_count_positive CHECK (usage_count >= 0),
    CONSTRAINT api_key_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- 15. WORKFLOW_SCHEDULES TABLE
CREATE TABLE workflow_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    input_data JSONB DEFAULT '{}',
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT schedule_failure_count_positive CHECK (failure_count >= 0),
    CONSTRAINT schedule_max_retries_positive CHECK (max_retries >= 0)
);

-- 16. SYSTEM_SETTINGS TABLE
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_setting_key UNIQUE (category, key)
);

-- ==============================================================
-- FOREIGN KEY CONSTRAINTS
-- ==============================================================

-- Users constraints
ALTER TABLE organization ADD CONSTRAINT fk_organization_admin_user 
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Organization User constraints
ALTER TABLE organization_user ADD CONSTRAINT fk_org_user_organization 
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;
ALTER TABLE organization_user ADD CONSTRAINT fk_org_user_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE organization_user ADD CONSTRAINT fk_org_user_role 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
ALTER TABLE organization_user ADD CONSTRAINT fk_org_user_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE organization_user ADD CONSTRAINT fk_org_user_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Workflow constraints
ALTER TABLE workflows ADD CONSTRAINT fk_workflows_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE workflows ADD CONSTRAINT fk_workflows_organization 
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL;
ALTER TABLE workflows ADD CONSTRAINT fk_workflows_template_source 
    FOREIGN KEY (template_source_id) REFERENCES workflow_templates(id) ON DELETE SET NULL;

-- Workflow Template constraints
ALTER TABLE workflow_templates ADD CONSTRAINT fk_workflow_templates_author 
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- Workflow Execution constraints
ALTER TABLE workflow_executions ADD CONSTRAINT fk_workflow_executions_workflow 
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;
ALTER TABLE workflow_executions ADD CONSTRAINT fk_workflow_executions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE workflow_executions ADD CONSTRAINT fk_workflow_executions_organization 
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL;

-- Execution Checkpoint constraints
ALTER TABLE execution_checkpoints ADD CONSTRAINT fk_execution_checkpoints_execution 
    FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE;

-- User Credential constraints
ALTER TABLE user_credentials ADD CONSTRAINT fk_user_credentials_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Login Method constraints
ALTER TABLE login_method ADD CONSTRAINT fk_login_method_organization 
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;
ALTER TABLE login_method ADD CONSTRAINT fk_login_method_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE login_method ADD CONSTRAINT fk_login_method_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Login Activity constraints
ALTER TABLE login_activity ADD CONSTRAINT fk_login_activity_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Chat Message constraints
ALTER TABLE chat_message ADD CONSTRAINT fk_chat_message_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Workflow Sharing constraints
ALTER TABLE workflow_sharing ADD CONSTRAINT fk_workflow_sharing_workflow 
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;
ALTER TABLE workflow_sharing ADD CONSTRAINT fk_workflow_sharing_shared_by 
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE workflow_sharing ADD CONSTRAINT fk_workflow_sharing_shared_with 
    FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE workflow_sharing ADD CONSTRAINT fk_workflow_sharing_organization 
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;

-- API Keys constraints
ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Workflow Schedules constraints
ALTER TABLE workflow_schedules ADD CONSTRAINT fk_workflow_schedules_workflow 
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;
ALTER TABLE workflow_schedules ADD CONSTRAINT fk_workflow_schedules_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ==============================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Roles indexes
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_is_system ON roles(is_system_role);

-- Organization indexes
CREATE INDEX idx_organization_admin_user_id ON organization(admin_user_id);
CREATE INDEX idx_organization_name ON organization(name);
CREATE INDEX idx_organization_type ON organization(organization_type);
CREATE INDEX idx_organization_plan ON organization(subscription_plan);

-- Organization User indexes
CREATE INDEX idx_organization_user_role_id ON organization_user(role_id);
CREATE INDEX idx_organization_user_status ON organization_user(status);
CREATE INDEX idx_organization_user_joined_at ON organization_user(joined_at);

-- Workflow indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX idx_workflows_is_public ON workflows(is_public);
CREATE INDEX idx_workflows_name ON workflows(name);
CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_is_template ON workflows(is_template);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);
CREATE INDEX idx_workflows_last_executed ON workflows(last_executed_at);
CREATE INDEX idx_workflows_tags ON workflows USING GIN(tags);
CREATE INDEX idx_workflows_flow_data_gin ON workflows USING GIN(flow_data);
CREATE INDEX idx_workflows_user_public ON workflows(user_id, is_public);

-- Workflow Template indexes
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_name ON workflow_templates(name);
CREATE INDEX idx_workflow_templates_author_id ON workflow_templates(author_id);
CREATE INDEX idx_workflow_templates_is_official ON workflow_templates(is_official);
CREATE INDEX idx_workflow_templates_is_featured ON workflow_templates(is_featured);
CREATE INDEX idx_workflow_templates_rating ON workflow_templates(rating);
CREATE INDEX idx_workflow_templates_download_count ON workflow_templates(download_count);
CREATE INDEX idx_workflow_templates_tags ON workflow_templates USING GIN(tags);
CREATE INDEX idx_workflow_templates_flow_data_gin ON workflow_templates USING GIN(flow_data);

-- Workflow Execution indexes
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_organization_id ON workflow_executions(organization_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_session_id ON workflow_executions(session_id);
CREATE INDEX idx_workflow_executions_execution_mode ON workflow_executions(execution_mode);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at);
CREATE INDEX idx_workflow_executions_completed_at ON workflow_executions(completed_at);
CREATE INDEX idx_workflow_executions_user_status ON workflow_executions(user_id, status);
CREATE INDEX idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX idx_workflow_executions_status_time ON workflow_executions(status, started_at) WHERE status IN ('running', 'pending');
CREATE INDEX idx_workflow_executions_inputs_gin ON workflow_executions USING GIN(inputs);
CREATE INDEX idx_workflow_executions_outputs_gin ON workflow_executions USING GIN(outputs);

-- Execution Checkpoint indexes
CREATE INDEX idx_execution_checkpoints_parent ON execution_checkpoints(parent_checkpoint_id);
CREATE INDEX idx_execution_checkpoints_step ON execution_checkpoints(step_number);
CREATE INDEX idx_execution_checkpoints_type ON execution_checkpoints(checkpoint_type);
CREATE INDEX idx_execution_checkpoints_data_gin ON execution_checkpoints USING GIN(checkpoint_data);

-- User Credential indexes
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX idx_user_credentials_service_type ON user_credentials(service_type);
CREATE INDEX idx_user_credentials_is_active ON user_credentials(is_active);
CREATE INDEX idx_user_credentials_expires_at ON user_credentials(expires_at);
CREATE INDEX idx_user_credentials_user_service ON user_credentials(user_id, service_type) WHERE is_active = true;

-- Login Method indexes
CREATE INDEX idx_login_method_organization_id ON login_method(organization_id);
CREATE INDEX idx_login_method_status ON login_method(status);
CREATE INDEX idx_login_method_type ON login_method(method_type);
CREATE INDEX idx_login_method_priority ON login_method(priority);

-- Login Activity indexes
CREATE INDEX idx_login_activity_username ON login_activity(username);
CREATE INDEX idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX idx_login_activity_attempted_at ON login_activity(attempted_at);
CREATE INDEX idx_login_activity_activity_code ON login_activity(activity_code);
CREATE INDEX idx_login_activity_activity_type ON login_activity(activity_type);
CREATE INDEX idx_login_activity_success ON login_activity(success);
CREATE INDEX idx_login_activity_ip_address ON login_activity(ip_address);
CREATE INDEX idx_login_activity_session_id ON login_activity(session_id);
CREATE INDEX idx_login_activity_risk_score ON login_activity(risk_score);
CREATE INDEX idx_login_activity_username_attempted ON login_activity(username, attempted_at);
CREATE INDEX idx_login_activity_failed_attempts ON login_activity(username, attempted_at) WHERE success = false;

-- Chat Message indexes
CREATE INDEX idx_chat_message_chatflow_id ON chat_message(chatflow_id);
CREATE INDEX idx_chat_message_session_id ON chat_message(session_id);
CREATE INDEX idx_chat_message_user_id ON chat_message(user_id);
CREATE INDEX idx_chat_message_role ON chat_message(role);
CREATE INDEX idx_chat_message_created_at ON chat_message(created_at);
CREATE INDEX idx_chat_message_model_used ON chat_message(model_used);
CREATE INDEX idx_chat_message_chatflow_created ON chat_message(chatflow_id, created_at);
CREATE INDEX idx_chat_message_session_created ON chat_message(session_id, created_at DESC);

-- Workflow Sharing indexes
CREATE INDEX idx_workflow_sharing_workflow_id ON workflow_sharing(workflow_id);
CREATE INDEX idx_workflow_sharing_shared_with ON workflow_sharing(shared_with);
CREATE INDEX idx_workflow_sharing_organization_id ON workflow_sharing(organization_id);
CREATE INDEX idx_workflow_sharing_permission ON workflow_sharing(permission_level);
CREATE INDEX idx_workflow_sharing_expires_at ON workflow_sharing(expires_at);

-- API Keys indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_last_used_at ON api_keys(last_used_at);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- Workflow Schedules indexes
CREATE INDEX idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
CREATE INDEX idx_workflow_schedules_user_id ON workflow_schedules(user_id);
CREATE INDEX idx_workflow_schedules_is_active ON workflow_schedules(is_active);
CREATE INDEX idx_workflow_schedules_next_run_at ON workflow_schedules(next_run_at) WHERE is_active = true;

-- System Settings indexes
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);

-- ==============================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================

-- Users trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Roles trigger
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Organization trigger
CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON organization
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Organization User trigger
CREATE TRIGGER update_organization_user_updated_at BEFORE UPDATE ON organization_user
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workflows trigger
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workflow Templates trigger
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Execution Checkpoints trigger
CREATE TRIGGER update_execution_checkpoints_updated_at BEFORE UPDATE ON execution_checkpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Credentials trigger
CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE ON user_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Login Method trigger
CREATE TRIGGER update_login_method_updated_at BEFORE UPDATE ON login_method
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workflow Schedules trigger
CREATE TRIGGER update_workflow_schedules_updated_at BEFORE UPDATE ON workflow_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- System Settings trigger
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- DEFAULT DATA INSERTION
-- ==============================================================

-- Insert default roles
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('admin', 'Full system administrator with all permissions', 'all', true),
('organization_admin', 'Organization administrator with org-level permissions', 'manage_organization,create_workflow,execute_workflow,manage_credentials,view_analytics', true),
('user', 'Standard user with workflow creation and execution', 'create_workflow,execute_workflow,manage_credentials,share_workflow', true),
('viewer', 'Read-only access to shared workflows', 'view_workflows,execute_public_workflows', true),
('api_user', 'API-only user for programmatic access', 'api_access,execute_workflow', true);

-- Insert system organization for standalone users
INSERT INTO organization (id, name, organization_type, subscription_plan) VALUES
(uuid_generate_v4(), 'System Default', 'standard', 'free');

-- Insert default system settings
INSERT INTO system_settings (category, key, value, description, is_public) VALUES
('system', 'version', '"1.0.0"', 'Current system version', true),
('system', 'maintenance_mode', 'false', 'System maintenance mode status', true),
('limits', 'max_workflows_per_user', '100', 'Maximum workflows per user', false),
('limits', 'max_executions_per_hour', '1000', 'Maximum executions per hour per user', false),
('features', 'workflow_sharing_enabled', 'true', 'Enable workflow sharing feature', true),
('features', 'api_access_enabled', 'true', 'Enable API access', true);

-- Insert workflow categories as system settings
INSERT INTO system_settings (category, key, value, description, is_public) VALUES
('workflow_categories', 'ai_assistants', '{"name": "AI Assistants", "description": "Conversational AI and chatbot workflows", "icon": "bot"}', 'AI Assistants category', true),
('workflow_categories', 'content_generation', '{"name": "Content Generation", "description": "Text, image, and media generation workflows", "icon": "pen-tool"}', 'Content Generation category', true),
('workflow_categories', 'data_processing', '{"name": "Data Processing", "description": "Data analysis and transformation workflows", "icon": "database"}', 'Data Processing category', true),
('workflow_categories', 'integration', '{"name": "Integration", "description": "API and service integration workflows", "icon": "link"}', 'Integration category', true),
('workflow_categories', 'automation', '{"name": "Automation", "description": "Business process automation workflows", "icon": "zap"}', 'Automation category', true),
('workflow_categories', 'research', '{"name": "Research", "description": "Information gathering and analysis workflows", "icon": "search"}', 'Research category', true);

-- ==============================================================
-- VIEWS FOR COMMON QUERIES
-- ==============================================================

-- User dashboard view
CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.last_login,
    u.created_at,
    COUNT(DISTINCT w.id) as workflow_count,
    COUNT(DISTINCT we.id) as execution_count,
    COUNT(DISTINCT uc.id) as credential_count,
    COUNT(DISTINCT ws.id) as shared_workflow_count,
    MAX(we.created_at) as last_execution_at
FROM users u
LEFT JOIN workflows w ON u.id = w.user_id
LEFT JOIN workflow_executions we ON u.id = we.user_id
LEFT JOIN user_credentials uc ON u.id = uc.user_id AND uc.is_active = true
LEFT JOIN workflow_sharing ws ON u.id = ws.shared_with
GROUP BY u.id, u.email, u.full_name, u.role, u.status, u.last_login, u.created_at;

-- Workflow statistics view
CREATE VIEW workflow_statistics AS
SELECT 
    w.id,
    w.name,
    w.category,
    w.is_public,
    w.execution_count,
    w.last_executed_at,
    w.created_at,
    u.email as owner_email,
    COUNT(DISTINCT we.id) as total_executions,
    COUNT(DISTINCT ws.id) as share_count,
    AVG(we.execution_time_ms) as avg_execution_time_ms,
    COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'completed') as successful_executions,
    COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'failed') as failed_executions
FROM workflows w
JOIN users u ON w.user_id = u.id
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
LEFT JOIN workflow_sharing ws ON w.id = ws.workflow_id
GROUP BY w.id, w.name, w.category, w.is_public, w.execution_count, w.last_executed_at, w.created_at, u.email;

-- System health view
CREATE VIEW system_health AS
SELECT 
    'users' as metric,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_new,
    COUNT(*) FILTER (WHERE status = 'active') as active_count
FROM users
UNION ALL
SELECT 
    'workflows' as metric,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_new,
    COUNT(*) FILTER (WHERE is_public = true) as public_count
FROM workflows
UNION ALL
SELECT 
    'executions' as metric,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_new,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count
FROM workflow_executions
UNION ALL
SELECT 
    'organizations' as metric,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_new,
    COUNT(*) FILTER (WHERE subscription_plan != 'free') as paid_count
FROM organization;

-- Popular templates view
CREATE VIEW popular_templates AS
SELECT 
    wt.id,
    wt.name,
    wt.category,
    wt.download_count,
    wt.rating,
    wt.rating_count,
    wt.is_official,
    wt.is_featured,
    wt.created_at,
    u.full_name as author_name,
    COUNT(DISTINCT w.id) as instances_created
FROM workflow_templates wt
LEFT JOIN users u ON wt.author_id = u.id
LEFT JOIN workflows w ON wt.id = w.template_source_id
GROUP BY wt.id, wt.name, wt.category, wt.download_count, wt.rating, wt.rating_count, 
         wt.is_official, wt.is_featured, wt.created_at, u.full_name
ORDER BY wt.download_count DESC, wt.rating DESC;

-- ==============================================================
-- COMPLETION MESSAGE
-- ==============================================================

DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Count objects created
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
    
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'KAI-Fusion Database Schema Creation Completed Successfully!';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Views created: %', view_count;
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE 'Triggers created: %', trigger_count;
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Database is ready for KAI-Fusion application deployment.';
    RAISE NOTICE '=======================================================';
END $$;