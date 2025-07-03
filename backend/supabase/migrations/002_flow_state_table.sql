-- Migration: Create flow_states table for LangGraph checkpointing
-- This table stores workflow execution state for session persistence

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create flow_states table for checkpointing
CREATE TABLE IF NOT EXISTS flow_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id VARCHAR(255) NOT NULL,
    checkpoint_id VARCHAR(255) NOT NULL,
    parent_checkpoint_id VARCHAR(255),
    checkpoint_data TEXT NOT NULL, -- JSON serialized checkpoint
    metadata TEXT, -- JSON serialized metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_states_thread_id ON flow_states(thread_id);
CREATE INDEX IF NOT EXISTS idx_flow_states_checkpoint_id ON flow_states(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_flow_states_created_at ON flow_states(created_at);

-- Create unique constraint for thread_id + checkpoint_id combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_states_thread_checkpoint 
ON flow_states(thread_id, checkpoint_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_flow_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_flow_states_updated_at
    BEFORE UPDATE ON flow_states
    FOR EACH ROW
    EXECUTE FUNCTION update_flow_states_updated_at();

-- Add comments for documentation
COMMENT ON TABLE flow_states IS 'Stores LangGraph workflow execution states for session persistence';
COMMENT ON COLUMN flow_states.thread_id IS 'Session identifier for grouping related checkpoints';
COMMENT ON COLUMN flow_states.checkpoint_id IS 'Unique identifier for this specific checkpoint';
COMMENT ON COLUMN flow_states.parent_checkpoint_id IS 'Reference to parent checkpoint for state history';
COMMENT ON COLUMN flow_states.checkpoint_data IS 'Serialized workflow state data (JSON)';
COMMENT ON COLUMN flow_states.metadata IS 'Additional metadata about the checkpoint (JSON)';

-- Optional: Create a view for easy querying of latest checkpoints
CREATE OR REPLACE VIEW latest_flow_states AS
SELECT DISTINCT ON (thread_id) 
    id,
    thread_id,
    checkpoint_id,
    parent_checkpoint_id,
    checkpoint_data,
    metadata,
    created_at,
    updated_at
FROM flow_states
ORDER BY thread_id, created_at DESC;

COMMENT ON VIEW latest_flow_states IS 'View showing the most recent checkpoint for each thread_id'; 