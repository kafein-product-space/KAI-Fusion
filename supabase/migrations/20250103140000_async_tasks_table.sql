-- Migration: Add async task management tables
-- Created: Epic 4 - Async Execution Implementation
-- Description: Tables for tracking Celery task execution with progress, status, and results

-- Create task status enum
CREATE TYPE task_status AS ENUM (
    'pending',
    'started', 
    'progress',
    'success',
    'failure',
    'retry',
    'revoked'
);

-- Create task type enum  
CREATE TYPE task_type AS ENUM (
    'workflow_execution',
    'bulk_workflow_execution',
    'workflow_validation',
    'credential_test',
    'system_cleanup',
    'health_check'
);

-- Create async_tasks table
CREATE TABLE IF NOT EXISTS async_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    celery_task_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_type task_type NOT NULL,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    status task_status NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    inputs JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    retry_policy JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration REAL, -- seconds
    
    -- Constraints
    CONSTRAINT valid_progress CHECK (
        (status IN ('pending', 'started') AND progress >= 0) OR
        (status = 'progress' AND progress > 0 AND progress < 100) OR
        (status IN ('success', 'failure', 'revoked') AND progress >= 0)
    ),
    CONSTRAINT valid_timestamps CHECK (
        created_at <= COALESCE(started_at, NOW()) AND
        COALESCE(started_at, NOW()) <= COALESCE(completed_at, NOW())
    )
);

-- Create indexes for performance
CREATE INDEX idx_async_tasks_user_id ON async_tasks(user_id);
CREATE INDEX idx_async_tasks_celery_task_id ON async_tasks(celery_task_id);
CREATE INDEX idx_async_tasks_workflow_id ON async_tasks(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX idx_async_tasks_status ON async_tasks(status);
CREATE INDEX idx_async_tasks_task_type ON async_tasks(task_type);
CREATE INDEX idx_async_tasks_created_at ON async_tasks(created_at DESC);
CREATE INDEX idx_async_tasks_priority_status ON async_tasks(priority, status) WHERE status IN ('pending', 'started');

-- Create composite index for user task queries
CREATE INDEX idx_async_tasks_user_status_created ON async_tasks(user_id, status, created_at DESC);

-- Create task execution logs table for detailed tracking
CREATE TABLE IF NOT EXISTS task_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES async_tasks(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR, DEBUG
    message TEXT NOT NULL,
    details JSONB,
    node_id VARCHAR(255), -- For workflow tasks
    step_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for task logs
CREATE INDEX idx_task_execution_logs_task_id ON task_execution_logs(task_id, created_at);
CREATE INDEX idx_task_execution_logs_level ON task_execution_logs(level);

-- Create view for active tasks
CREATE VIEW active_tasks AS
SELECT 
    t.*,
    w.name as workflow_name,
    EXTRACT(EPOCH FROM (NOW() - t.created_at)) as elapsed_seconds,
    CASE 
        WHEN t.estimated_duration IS NOT NULL AND t.progress > 0 
        THEN (t.estimated_duration * (100 - t.progress) / t.progress)
        ELSE NULL 
    END as estimated_remaining_seconds
FROM async_tasks t
LEFT JOIN workflows w ON t.workflow_id = w.id
WHERE t.status IN ('pending', 'started', 'progress', 'retry');

-- Create view for task statistics
CREATE VIEW task_statistics AS
SELECT 
    user_id,
    task_type,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status IN ('started', 'progress')) as running_tasks,
    COUNT(*) FILTER (WHERE status = 'success') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'failure') as failed_tasks,
    COUNT(*) FILTER (WHERE status = 'revoked') as revoked_tasks,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'success' AND started_at IS NOT NULL AND completed_at IS NOT NULL) as avg_execution_time,
    (COUNT(*) FILTER (WHERE status = 'success')::FLOAT / NULLIF(COUNT(*) FILTER (WHERE status IN ('success', 'failure')), 0) * 100) as success_rate
FROM async_tasks
GROUP BY user_id, task_type;

-- Row Level Security (RLS) policies
ALTER TABLE async_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tasks
CREATE POLICY async_tasks_user_policy ON async_tasks
    FOR ALL
    USING (auth.uid() = user_id);

-- Policy: Users can only see logs for their own tasks  
CREATE POLICY task_logs_user_policy ON task_execution_logs
    FOR ALL
    USING (
        task_id IN (
            SELECT id FROM async_tasks WHERE user_id = auth.uid()
        )
    );

-- Function to automatically update task completion time
CREATE OR REPLACE FUNCTION update_task_completion_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Set started_at when status changes to 'started'
    IF NEW.status = 'started' AND OLD.status = 'pending' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Set completed_at when task finishes
    IF NEW.status IN ('success', 'failure', 'revoked') AND OLD.status NOT IN ('success', 'failure', 'revoked') THEN
        NEW.completed_at = NOW();
        
        -- Set progress to 100 for successful tasks
        IF NEW.status = 'success' THEN
            NEW.progress = 100;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_task_completion_time_trigger
    BEFORE UPDATE ON async_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_completion_time();

-- Function to clean up old completed tasks (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_tasks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM async_tasks 
    WHERE status IN ('success', 'failure', 'revoked')
    AND completed_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON async_tasks TO postgres, anon, authenticated, service_role;
GRANT ALL ON task_execution_logs TO postgres, anon, authenticated, service_role;
GRANT SELECT ON active_tasks TO postgres, anon, authenticated, service_role;
GRANT SELECT ON task_statistics TO postgres, anon, authenticated, service_role; 