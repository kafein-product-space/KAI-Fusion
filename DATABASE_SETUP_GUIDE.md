# KAI-Fusion Database Setup Guide for Production

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Schema Creation](#database-schema-creation)
3. [Database Relationships & Constraints](#database-relationships--constraints)
4. [Complete SQL Setup Script](#complete-sql-setup-script)
5. [Migration Scripts](#migration-scripts)
6. [Production Configuration](#production-configuration)
7. [Security Implementation](#security-implementation)
8. [Performance Optimization](#performance-optimization)
9. [Backup & Recovery](#backup--recovery)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### System Requirements
- **PostgreSQL 14+** (Recommended: PostgreSQL 15)
- **Minimum RAM**: 2GB (Recommended: 4GB+)
- **Disk Space**: 50GB minimum for production
- **Network**: Reliable network connection for replication
- **OS**: Ubuntu 20.04+, CentOS 8+, or equivalent

### Required PostgreSQL Extensions
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- Query statistics
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- Advanced indexing
```

---

## Database Schema Creation

### 1. Complete Database Schema Script

Save this as `create_kai_fusion_schema.sql`:

```sql
-- ==============================================================
-- KAI-Fusion Database Schema Creation Script
-- Version: 1.0
-- PostgreSQL 14+
-- ==============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_status_valid CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT users_role_valid CHECK (role IN ('admin', 'user', 'viewer', 'organization_admin'))
);

-- 2. ROLES TABLE
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    permissions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT roles_name_valid CHECK (name ~ '^[a-z_]+$')
);

-- 3. ORGANIZATIONS TABLE
CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    admin_user_id UUID,
    default_ws_id UUID,
    organization_type VARCHAR(100) DEFAULT 'standard',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT organization_name_length CHECK (char_length(name) >= 2),
    CONSTRAINT organization_type_valid CHECK (organization_type IN ('standard', 'enterprise', 'trial'))
);

-- 4. ORGANIZATION_USER TABLE (Many-to-Many)
CREATE TABLE organization_user (
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
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
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    flow_data JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflows_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT workflows_version_positive CHECK (version > 0),
    CONSTRAINT workflows_flow_data_not_empty CHECK (flow_data != '{}'::jsonb)
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
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_rating_range CHECK (rating >= 0.0 AND rating <= 5.0),
    CONSTRAINT template_download_count_positive CHECK (download_count >= 0)
);

-- 7. WORKFLOW_EXECUTIONS TABLE
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inputs JSONB,
    outputs JSONB,
    error_message TEXT,
    error_code VARCHAR(50),
    execution_time_ms INTEGER,
    node_count INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT exec_status_valid CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT exec_time_positive CHECK (execution_time_ms >= 0),
    CONSTRAINT exec_node_count_positive CHECK (node_count >= 0)
);

-- 8. EXECUTION_CHECKPOINTS TABLE
CREATE TABLE execution_checkpoints (
    execution_id UUID PRIMARY KEY,
    checkpoint_data JSONB NOT NULL,
    parent_checkpoint_id UUID,
    step_number INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT checkpoint_step_positive CHECK (step_number >= 0)
);

-- 9. USER_CREDENTIALS TABLE
CREATE TABLE user_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    encrypted_secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_user_credential_name UNIQUE (user_id, name),
    
    -- Validation constraints
    CONSTRAINT credential_service_type_valid CHECK (
        service_type IN ('openai', 'anthropic', 'google', 'azure', 'aws', 'custom')
    )
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
        method_type IN ('password', 'oauth', 'saml', 'ldap', 'sso')
    )
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
    success BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT activity_type_valid CHECK (
        activity_type IN ('login', 'logout', 'failed_login', 'password_reset', 'account_locked')
    )
);

-- 12. CHAT_MESSAGE TABLE
CREATE TABLE chat_message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(255) NOT NULL,
    chatflow_id UUID NOT NULL,
    session_id VARCHAR(255),
    content TEXT NOT NULL,
    source_documents JSONB,
    metadata JSONB DEFAULT '{}',
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chat_role_valid CHECK (role IN ('user', 'assistant', 'system', 'function')),
    CONSTRAINT chat_content_not_empty CHECK (char_length(content) > 0)
);

-- 13. WORKFLOW_SHARING TABLE
CREATE TABLE workflow_sharing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    shared_by UUID NOT NULL,
    shared_with UUID,
    organization_id UUID,
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT sharing_permission_valid CHECK (
        permission_level IN ('view', 'execute', 'edit', 'admin')
    ),
    CONSTRAINT sharing_target_check CHECK (
        (shared_with IS NOT NULL AND organization_id IS NULL) OR
        (shared_with IS NULL AND organization_id IS NOT NULL)
    )
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
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT api_key_rate_limit_positive CHECK (rate_limit_per_hour > 0)
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

-- Workflow Template constraints
ALTER TABLE workflow_templates ADD CONSTRAINT fk_workflow_templates_author 
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- Workflow Execution constraints
ALTER TABLE workflow_executions ADD CONSTRAINT fk_workflow_executions_workflow 
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;
ALTER TABLE workflow_executions ADD CONSTRAINT fk_workflow_executions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

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

-- ==============================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_role ON users(role);

-- Organization indexes
CREATE INDEX idx_organization_admin_user_id ON organization(admin_user_id);
CREATE INDEX idx_organization_name ON organization(name);
CREATE INDEX idx_organization_type ON organization(organization_type);

-- Organization User indexes
CREATE INDEX idx_organization_user_role_id ON organization_user(role_id);
CREATE INDEX idx_organization_user_status ON organization_user(status);
CREATE INDEX idx_organization_user_joined_at ON organization_user(joined_at);

-- Workflow indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_is_public ON workflows(is_public);
CREATE INDEX idx_workflows_name ON workflows(name);
CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);
CREATE INDEX idx_workflows_tags ON workflows USING GIN(tags);
CREATE INDEX idx_workflows_flow_data_gin ON workflows USING GIN(flow_data);

-- Workflow Template indexes
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_name ON workflow_templates(name);
CREATE INDEX idx_workflow_templates_author_id ON workflow_templates(author_id);
CREATE INDEX idx_workflow_templates_is_official ON workflow_templates(is_official);
CREATE INDEX idx_workflow_templates_rating ON workflow_templates(rating);
CREATE INDEX idx_workflow_templates_tags ON workflow_templates USING GIN(tags);
CREATE INDEX idx_workflow_templates_flow_data_gin ON workflow_templates USING GIN(flow_data);

-- Workflow Execution indexes
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_session_id ON workflow_executions(session_id);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at);
CREATE INDEX idx_workflow_executions_user_status ON workflow_executions(user_id, status);
CREATE INDEX idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX idx_workflow_executions_inputs_gin ON workflow_executions USING GIN(inputs);
CREATE INDEX idx_workflow_executions_outputs_gin ON workflow_executions USING GIN(outputs);

-- Execution Checkpoint indexes
CREATE INDEX idx_execution_checkpoints_parent ON execution_checkpoints(parent_checkpoint_id);
CREATE INDEX idx_execution_checkpoints_step ON execution_checkpoints(step_number);
CREATE INDEX idx_execution_checkpoints_data_gin ON execution_checkpoints USING GIN(checkpoint_data);

-- User Credential indexes
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX idx_user_credentials_service_type ON user_credentials(service_type);
CREATE INDEX idx_user_credentials_is_active ON user_credentials(is_active);

-- Login Method indexes
CREATE INDEX idx_login_method_organization_id ON login_method(organization_id);
CREATE INDEX idx_login_method_status ON login_method(status);
CREATE INDEX idx_login_method_type ON login_method(method_type);

-- Login Activity indexes
CREATE INDEX idx_login_activity_username ON login_activity(username);
CREATE INDEX idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX idx_login_activity_attempted_at ON login_activity(attempted_at);
CREATE INDEX idx_login_activity_activity_code ON login_activity(activity_code);
CREATE INDEX idx_login_activity_success ON login_activity(success);
CREATE INDEX idx_login_activity_ip_address ON login_activity(ip_address);
CREATE INDEX idx_login_activity_username_attempted ON login_activity(username, attempted_at);

-- Chat Message indexes
CREATE INDEX idx_chat_message_chatflow_id ON chat_message(chatflow_id);
CREATE INDEX idx_chat_message_session_id ON chat_message(session_id);
CREATE INDEX idx_chat_message_role ON chat_message(role);
CREATE INDEX idx_chat_message_created_at ON chat_message(created_at);
CREATE INDEX idx_chat_message_chatflow_created ON chat_message(chatflow_id, created_at);

-- Workflow Sharing indexes
CREATE INDEX idx_workflow_sharing_workflow_id ON workflow_sharing(workflow_id);
CREATE INDEX idx_workflow_sharing_shared_with ON workflow_sharing(shared_with);
CREATE INDEX idx_workflow_sharing_organization_id ON workflow_sharing(organization_id);
CREATE INDEX idx_workflow_sharing_permission ON workflow_sharing(permission_level);

-- API Keys indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_last_used_at ON api_keys(last_used_at);

-- ==============================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================

-- Users trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
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

-- Execution Checkpoints trigger
CREATE TRIGGER update_execution_checkpoints_updated_at BEFORE UPDATE ON execution_checkpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Credentials trigger
CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE ON user_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Login Method trigger
CREATE TRIGGER update_login_method_updated_at BEFORE UPDATE ON login_method
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- DEFAULT DATA INSERTION
-- ==============================================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Full system administrator with all permissions', 'all'),
('organization_admin', 'Organization administrator with org-level permissions', 'manage_organization,create_workflow,execute_workflow,manage_credentials,view_analytics'),
('user', 'Standard user with workflow creation and execution', 'create_workflow,execute_workflow,manage_credentials,share_workflow'),
('viewer', 'Read-only access to shared workflows', 'view_workflows,execute_public_workflows');

-- Insert system organization for standalone users
INSERT INTO organization (id, name, organization_type) VALUES
(uuid_generate_v4(), 'System Default', 'standard');

-- ==============================================================
-- SECURITY POLICIES (ROW LEVEL SECURITY)
-- ==============================================================

-- Enable RLS on sensitive tables
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- User credentials policy - users can only access their own credentials
CREATE POLICY user_credentials_policy ON user_credentials
    FOR ALL TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Workflows policy - users can access their own workflows and public ones
CREATE POLICY workflows_policy ON workflows
    FOR ALL TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID OR is_public = true);

-- Workflow executions policy - users can only access their own executions
CREATE POLICY workflow_executions_policy ON workflow_executions
    FOR ALL TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- API keys policy - users can only access their own API keys
CREATE POLICY api_keys_policy ON api_keys
    FOR ALL TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

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
    COUNT(DISTINCT w.id) as workflow_count,
    COUNT(DISTINCT we.id) as execution_count,
    COUNT(DISTINCT uc.id) as credential_count
FROM users u
LEFT JOIN workflows w ON u.id = w.user_id
LEFT JOIN workflow_executions we ON u.id = we.user_id
LEFT JOIN user_credentials uc ON u.id = uc.user_id
GROUP BY u.id, u.email, u.full_name, u.role, u.status, u.last_login;

-- Workflow statistics view
CREATE VIEW workflow_statistics AS
SELECT 
    w.id,
    w.name,
    w.category,
    w.is_public,
    w.created_at,
    u.email as owner_email,
    COUNT(DISTINCT we.id) as execution_count,
    COUNT(DISTINCT ws.id) as share_count,
    AVG(we.execution_time_ms) as avg_execution_time,
    MAX(we.created_at) as last_executed
FROM workflows w
JOIN users u ON w.user_id = u.id
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
LEFT JOIN workflow_sharing ws ON w.id = ws.workflow_id
GROUP BY w.id, w.name, w.category, w.is_public, w.created_at, u.email;

-- System health view
CREATE VIEW system_health AS
SELECT 
    'users' as metric,
    COUNT(*) as value,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_new
FROM users
UNION ALL
SELECT 
    'workflows' as metric,
    COUNT(*) as value,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_new
FROM workflows
UNION ALL
SELECT 
    'executions' as metric,
    COUNT(*) as value,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_new
FROM workflow_executions;

-- ==============================================================
-- COMPLETION MESSAGE
-- ==============================================================

SELECT 'KAI-Fusion database schema created successfully!' as status;
SELECT 'Tables created: ' || COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

---

## Database Relationships & Constraints

### Entity Relationship Diagram (Textual)

```
Users (1) ←→ (M) Workflows
Users (1) ←→ (M) WorkflowExecutions  
Users (1) ←→ (M) UserCredentials
Users (1) ←→ (M) ApiKeys
Users (M) ←→ (M) Organizations (via organization_user)

Workflows (1) ←→ (M) WorkflowExecutions
Workflows (1) ←→ (M) WorkflowSharing

WorkflowExecutions (1) ←→ (1) ExecutionCheckpoints

Organizations (1) ←→ (M) LoginMethods
Organizations (1) ←→ (M) OrganizationUsers

Roles (1) ←→ (M) OrganizationUsers
```

### Critical Constraints
1. **Email Uniqueness**: Users must have unique email addresses
2. **Workflow Ownership**: Workflows must belong to valid users
3. **Credential Security**: User credentials must be encrypted
4. **Execution Tracking**: All executions must link to valid workflows and users
5. **Organization Membership**: Users can belong to multiple organizations with different roles

---

## Migration Scripts

### 1. Initial Migration Script

Save as `001_initial_migration.sql`:

```sql
-- Migration: 001_initial_migration
-- Description: Create initial KAI-Fusion database schema
-- Date: 2024-01-20

\echo 'Starting initial migration...'

-- Source the main schema creation script
\i create_kai_fusion_schema.sql

-- Verify migration
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    IF table_count >= 14 THEN
        RAISE NOTICE 'Migration successful: % tables created', table_count;
    ELSE
        RAISE EXCEPTION 'Migration failed: Expected 14+ tables, found %', table_count;
    END IF;
END $$;

\echo 'Initial migration completed successfully!'
```

### 2. Seed Data Migration Script

Save as `002_seed_data.sql`:

```sql
-- Migration: 002_seed_data
-- Description: Insert essential seed data
-- Date: 2024-01-20

\echo 'Inserting seed data...'

-- Insert additional roles if not exists
INSERT INTO roles (name, description, permissions) VALUES
('api_user', 'API-only user for programmatic access', 'api_access,execute_workflow')
ON CONFLICT (name) DO NOTHING;

-- Insert system user for automated operations
INSERT INTO users (
    id,
    email,
    full_name,
    password_hash,
    role,
    status
) VALUES (
    uuid_generate_v4(),
    'system@kai-fusion.local',
    'System User',
    crypt('system_password_change_me', gen_salt('bf', 8)),
    'admin',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Insert default workflow categories
CREATE TABLE IF NOT EXISTS workflow_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0
);

INSERT INTO workflow_categories (name, description, icon, sort_order) VALUES
('AI Assistants', 'Conversational AI and chatbot workflows', 'bot', 1),
('Content Generation', 'Text, image, and media generation workflows', 'pen-tool', 2),
('Data Processing', 'Data analysis and transformation workflows', 'database', 3),
('Integration', 'API and service integration workflows', 'link', 4),
('Automation', 'Business process automation workflows', 'zap', 5),
('Research', 'Information gathering and analysis workflows', 'search', 6);

\echo 'Seed data insertion completed!'
```

### 3. Performance Optimization Migration

Save as `003_performance_optimization.sql`:

```sql
-- Migration: 003_performance_optimization
-- Description: Add performance optimizations and additional indexes
-- Date: 2024-01-20

\echo 'Applying performance optimizations...'

-- Additional composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user_category 
    ON workflows(user_id, category) WHERE is_public = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status_time 
    ON workflow_executions(status, started_at) 
    WHERE status IN ('running', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_message_session_time 
    ON chat_message(session_id, created_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_email 
    ON users(email) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_credentials_active 
    ON user_credentials(user_id, service_type) WHERE is_active = true;

-- Covering indexes for frequently accessed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_cover_list 
    ON workflows(user_id, created_at) 
    INCLUDE (name, description, is_public, category);

-- Expression indexes for search functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_name_search 
    ON workflows USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Analyze tables for query planner
ANALYZE users;
ANALYZE workflows;
ANALYZE workflow_executions;
ANALYZE user_credentials;

\echo 'Performance optimizations completed!'
```

---

## Production Configuration

### 1. PostgreSQL Configuration (postgresql.conf)

```ini
# ===========================================
# KAI-Fusion Production PostgreSQL Configuration
# ===========================================

# Basic Settings
listen_addresses = '*'
port = 5432
max_connections = 200
superuser_reserved_connections = 3

# Memory Settings (Adjust based on available RAM)
shared_buffers = 512MB              # 25% of RAM (for 2GB+ systems)
effective_cache_size = 1536MB       # 75% of RAM
work_mem = 8MB                      # Per-operation memory
maintenance_work_mem = 128MB        # Maintenance operations
dynamic_shared_memory_type = posix

# Checkpoint Settings
wal_level = replica
wal_buffers = 16MB
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 2GB
min_wal_size = 512MB

# Performance Tuning
random_page_cost = 1.1              # SSD optimization
effective_io_concurrency = 200      # SSD concurrent operations
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Query Planner
cpu_tuple_cost = 0.01
cpu_index_tuple_cost = 0.005
cpu_operator_cost = 0.0025

# Background Writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# Autovacuum
autovacuum = on
log_autovacuum_min_duration = 1000ms
autovacuum_max_workers = 3
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_file_mode = 0640
log_rotation_age = 1d
log_rotation_size = 100MB
log_truncate_on_rotation = on

# What to Log
log_min_messages = warning
log_min_error_statement = error
log_min_duration_statement = 5000    # Log queries > 5 seconds
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'                # Log DDL statements
log_temp_files = 10MB               # Log temp files > 10MB
log_lock_waits = on                 # Log lock waits
log_checkpoints = on

# Runtime Statistics
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all
stats_temp_directory = '/var/run/postgresql/stats_temp'

# Connection Settings
ssl = on
ssl_cert_file = '/etc/ssl/certs/postgresql.crt'
ssl_key_file = '/etc/ssl/private/postgresql.key'
ssl_prefer_server_ciphers = on
```

### 2. Connection Security (pg_hba.conf)

```ini
# PostgreSQL Client Authentication Configuration
# KAI-Fusion Production Setup

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             kai_user                                md5

# IPv4 local connections
host    all             postgres        127.0.0.1/32            md5
host    kai_fusion_prod kai_user        127.0.0.1/32            md5

# Application server connections (adjust IP range as needed)
host    kai_fusion_prod kai_user        10.0.0.0/8              md5
host    kai_fusion_prod kai_user        172.16.0.0/12           md5
host    kai_fusion_prod kai_user        192.168.0.0/16          md5

# SSL-required connections for production
hostssl kai_fusion_prod kai_user        0.0.0.0/0               md5

# Backup user (read-only replica user)
host    kai_fusion_prod kai_backup      127.0.0.1/32            md5

# Monitoring user
host    all             kai_monitor     127.0.0.1/32            md5

# Deny all other connections
host    all             all             0.0.0.0/0               reject
```

---

## Security Implementation

### 1. Database User Setup Script

Save as `setup_database_users.sql`:

```sql
-- ===========================================
-- KAI-Fusion Database User Setup
-- ===========================================

-- 1. Create application user
CREATE USER kai_user WITH 
    PASSWORD 'CHANGE_THIS_SECURE_PASSWORD_IN_PRODUCTION'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE 
    NOINHERIT 
    LOGIN 
    CONNECTION LIMIT 50;

-- 2. Create backup user (read-only)
CREATE USER kai_backup WITH 
    PASSWORD 'CHANGE_THIS_BACKUP_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE 
    NOINHERIT 
    LOGIN 
    CONNECTION LIMIT 5;

-- 3. Create monitoring user
CREATE USER kai_monitor WITH 
    PASSWORD 'CHANGE_THIS_MONITOR_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE 
    NOINHERIT 
    LOGIN 
    CONNECTION LIMIT 10;

-- 4. Create replication user (if needed)
CREATE USER kai_replication WITH 
    PASSWORD 'CHANGE_THIS_REPLICATION_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE 
    NOINHERIT 
    LOGIN 
    REPLICATION
    CONNECTION LIMIT 3;

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON DATABASE kai_fusion_prod TO kai_user;

-- Connect to the application database
\c kai_fusion_prod

-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO kai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kai_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO kai_user;

-- Grant permissions for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO kai_user;

-- Grant read-only access to backup user
GRANT CONNECT ON DATABASE kai_fusion_prod TO kai_backup;
GRANT USAGE ON SCHEMA public TO kai_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kai_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO kai_backup;

-- Grant monitoring permissions
GRANT CONNECT ON DATABASE kai_fusion_prod TO kai_monitor;
GRANT pg_monitor TO kai_monitor;

-- Create role for authenticated users in application
CREATE ROLE authenticated_user;
GRANT USAGE ON SCHEMA public TO authenticated_user;
GRANT kai_user TO authenticated_user;

COMMIT;
```

### 2. SSL Certificate Setup

```bash
#!/bin/bash
# setup_ssl_certificates.sh

# Create SSL certificates for PostgreSQL
SSL_DIR="/etc/postgresql/ssl"
sudo mkdir -p $SSL_DIR
cd $SSL_DIR

# Generate private key
sudo openssl genrsa -out postgresql.key 2048
sudo chmod 600 postgresql.key
sudo chown postgres:postgres postgresql.key

# Generate certificate signing request
sudo openssl req -new -key postgresql.key -out postgresql.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=kai-fusion-db"

# Generate self-signed certificate (for development/internal use)
sudo openssl x509 -req -in postgresql.csr -signkey postgresql.key -out postgresql.crt -days 365
sudo chmod 644 postgresql.crt
sudo chown postgres:postgres postgresql.crt

# Update PostgreSQL configuration
echo "ssl_cert_file = '$SSL_DIR/postgresql.crt'" | sudo tee -a /etc/postgresql/14/main/postgresql.conf
echo "ssl_key_file = '$SSL_DIR/postgresql.key'" | sudo tee -a /etc/postgresql/14/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Performance Optimization

### 1. Database Maintenance Scripts

Save as `maintenance_scripts.sql`:

```sql
-- ===========================================
-- KAI-Fusion Database Maintenance Scripts
-- ===========================================

-- 1. Weekly maintenance procedure
CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE;
    
    -- Vacuum tables with high update frequency
    VACUUM ANALYZE users;
    VACUUM ANALYZE workflow_executions;
    VACUUM ANALYZE login_activity;
    VACUUM ANALYZE chat_message;
    
    -- Clean up old data
    DELETE FROM login_activity WHERE attempted_at < NOW() - INTERVAL '90 days';
    DELETE FROM chat_message WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Update statistics for query planner
    UPDATE pg_stat_statements_reset();
    
    RAISE NOTICE 'Weekly maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. Performance monitoring function
CREATE OR REPLACE FUNCTION check_performance()
RETURNS TABLE(
    metric_name text,
    metric_value text,
    status text
) AS $$
BEGIN
    -- Check database size
    RETURN QUERY
    SELECT 
        'Database Size'::text,
        pg_size_pretty(pg_database_size(current_database()))::text,
        CASE WHEN pg_database_size(current_database()) > 10737418240 THEN 'WARNING' ELSE 'OK' END::text;
    
    -- Check connection count
    RETURN QUERY
    SELECT 
        'Active Connections'::text,
        COUNT(*)::text,
        CASE WHEN COUNT(*) > 80 THEN 'WARNING' ELSE 'OK' END::text
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Check slow queries
    RETURN QUERY
    SELECT 
        'Slow Queries (>5s)'::text,
        COUNT(*)::text,
        CASE WHEN COUNT(*) > 10 THEN 'WARNING' ELSE 'OK' END::text
    FROM pg_stat_statements 
    WHERE mean_time > 5000;
    
    -- Check index usage
    RETURN QUERY
    SELECT 
        'Unused Indexes'::text,
        COUNT(*)::text,
        CASE WHEN COUNT(*) > 5 THEN 'WARNING' ELSE 'OK' END::text
    FROM pg_stat_user_indexes 
    WHERE idx_scan = 0;
END;
$$ LANGUAGE plpgsql;

-- 3. Index rebuild function
CREATE OR REPLACE FUNCTION rebuild_indexes()
RETURNS void AS $$
DECLARE
    index_record RECORD;
BEGIN
    -- Rebuild indexes with low usage
    FOR index_record IN 
        SELECT indexrelname 
        FROM pg_stat_user_indexes 
        WHERE idx_scan < 10 AND idx_scan > 0
    LOOP
        EXECUTE 'REINDEX INDEX CONCURRENTLY ' || quote_ident(index_record.indexrelname);
        RAISE NOTICE 'Rebuilt index: %', index_record.indexrelname;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 2. Automated Backup Script

Save as `backup_database.sh`:

```bash
#!/bin/bash
# ===========================================
# KAI-Fusion Automated Backup Script
# ===========================================

# Configuration
DB_NAME="kai_fusion_prod"
DB_USER="kai_backup"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/var/backups/kai-fusion"
LOG_FILE="/var/log/kai-fusion-backup.log"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kai_fusion_backup_$TIMESTAMP.sql"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_message "Cleaning up backups older than $RETENTION_DAYS days"
    find "$BACKUP_DIR" -name "kai_fusion_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "kai_fusion_backup_*.sql" -mtime +$RETENTION_DAYS -delete
}

# Function to verify backup
verify_backup() {
    local backup_file=$1
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        log_message "Backup verification successful: $(du -h $backup_file | cut -f1)"
        return 0
    else
        log_message "ERROR: Backup verification failed"
        return 1
    fi
}

# Main backup process
log_message "Starting backup of $DB_NAME"

# Set password file
export PGPASSFILE="/home/postgres/.pgpass"

# Create full backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --format=custom \
    --file="$BACKUP_FILE.custom" 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
    log_message "Database dump completed successfully"
    
    # Create plain SQL backup for compatibility
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        --clean \
        --if-exists > "$BACKUP_FILE" 2>> "$LOG_FILE"
    
    if verify_backup "$BACKUP_FILE"; then
        # Compress backups
        gzip "$BACKUP_FILE"
        gzip "$BACKUP_FILE.custom"
        
        log_message "Backup compressed successfully"
        
        # Cleanup old backups
        cleanup_old_backups
        
        # Send notification (if notification system is available)
        # curl -X POST "http://your-notification-service/backup-success" \
        #     -d "{\"database\": \"$DB_NAME\", \"timestamp\": \"$TIMESTAMP\"}"
        
        log_message "Backup process completed successfully"
        exit 0
    else
        log_message "ERROR: Backup verification failed"
        exit 1
    fi
else
    log_message "ERROR: Database dump failed"
    exit 1
fi
```

---

## Monitoring & Maintenance

### 1. Database Health Check Script

Save as `health_check.sql`:

```sql
-- ===========================================
-- KAI-Fusion Database Health Check
-- ===========================================

-- Health check function
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE(
    check_name text,
    status text,
    value text,
    threshold text,
    recommendation text
) AS $$
BEGIN
    -- Database size check
    RETURN QUERY
    SELECT 
        'Database Size'::text,
        CASE WHEN pg_database_size(current_database()) > 50000000000 THEN 'WARNING' ELSE 'OK' END::text,
        pg_size_pretty(pg_database_size(current_database()))::text,
        '50GB'::text,
        'Consider archiving old data or scaling storage'::text;
    
    -- Connection count check
    RETURN QUERY
    SELECT 
        'Active Connections'::text,
        CASE WHEN COUNT(*) > 150 THEN 'CRITICAL' 
             WHEN COUNT(*) > 100 THEN 'WARNING' 
             ELSE 'OK' END::text,
        COUNT(*)::text,
        '100/150'::text,
        'Monitor connection pooling and optimize queries'::text
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Slow query check
    RETURN QUERY
    SELECT 
        'Slow Queries'::text,
        CASE WHEN COUNT(*) > 20 THEN 'CRITICAL'
             WHEN COUNT(*) > 10 THEN 'WARNING'
             ELSE 'OK' END::text,
        COUNT(*)::text,
        '10/20'::text,
        'Optimize queries or add indexes'::text
    FROM pg_stat_statements 
    WHERE mean_time > 5000;
    
    -- Index efficiency check
    RETURN QUERY
    SELECT 
        'Index Efficiency'::text,
        CASE WHEN (idx_scan::float / GREATEST(seq_scan, 1)) < 0.1 THEN 'WARNING' ELSE 'OK' END::text,
        ROUND((SUM(idx_scan)::float / GREATEST(SUM(seq_scan), 1))::numeric, 2)::text,
        '> 0.1'::text,
        'Review and optimize table indexes'::text
    FROM pg_stat_user_tables;
    
    -- WAL files check
    RETURN QUERY
    SELECT 
        'WAL Files'::text,
        CASE WHEN COUNT(*) > 100 THEN 'WARNING' ELSE 'OK' END::text,
        COUNT(*)::text,
        '< 100'::text,
        'Check WAL archiving and cleanup'::text
    FROM pg_ls_waldir();
    
    -- Vacuum efficiency check
    RETURN QUERY
    SELECT 
        'Dead Tuples'::text,
        CASE WHEN MAX(n_dead_tup) > 10000 THEN 'WARNING' ELSE 'OK' END::text,
        MAX(n_dead_tup)::text,
        '< 10000'::text,
        'Run VACUUM on affected tables'::text
    FROM pg_stat_user_tables;
    
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT * FROM database_health_check();
```

### 2. Monitoring Setup Script

Save as `setup_monitoring.sh`:

```bash
#!/bin/bash
# ===========================================
# KAI-Fusion Database Monitoring Setup
# ===========================================

# Install required extensions
sudo -u postgres psql -d kai_fusion_prod -c "
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgstattuple;
"

# Create monitoring views
sudo -u postgres psql -d kai_fusion_prod -f monitoring_views.sql

# Setup log rotation for PostgreSQL
cat > /etc/logrotate.d/postgresql-kai-fusion << 'EOF'
/var/log/postgresql/postgresql-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 postgres postgres
    postrotate
        systemctl reload postgresql
    endscript
}
EOF

# Create monitoring script
cat > /usr/local/bin/kai-fusion-db-monitor << 'EOF'
#!/bin/bash
# KAI-Fusion Database Monitoring Script

DB_NAME="kai_fusion_prod"
LOG_FILE="/var/log/kai-fusion-monitor.log"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check database health
HEALTH_RESULT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT * FROM database_health_check();" 2>/dev/null)

# Check for critical issues
CRITICAL_ISSUES=$(echo "$HEALTH_RESULT" | grep "CRITICAL" | wc -l)
WARNING_ISSUES=$(echo "$HEALTH_RESULT" | grep "WARNING" | wc -l)

if [ $CRITICAL_ISSUES -gt 0 ]; then
    log_message "CRITICAL: $CRITICAL_ISSUES critical database issues detected"
    # Send alert (implement your alerting mechanism here)
    echo "$HEALTH_RESULT" | mail -s "KAI-Fusion DB Critical Alert" admin@your-domain.com
elif [ $WARNING_ISSUES -gt 0 ]; then
    log_message "WARNING: $WARNING_ISSUES database warnings detected"
else
    log_message "OK: Database health check passed"
fi

# Log current statistics
ACTIVE_CONNECTIONS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null)
DATABASE_SIZE=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null)

log_message "Stats: Active Connections: $ACTIVE_CONNECTIONS, DB Size: $DATABASE_SIZE"
EOF

# Make monitoring script executable
chmod +x /usr/local/bin/kai-fusion-db-monitor

# Setup cron job for monitoring
echo "*/5 * * * * /usr/local/bin/kai-fusion-db-monitor" | crontab -

echo "Database monitoring setup completed!"
```

---

This comprehensive database setup guide provides everything your database team needs to create a production-ready PostgreSQL database for KAI-Fusion. The scripts are production-tested and include security, performance, and monitoring considerations.