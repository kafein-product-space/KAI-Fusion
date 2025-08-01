from sqlalchemy import Column, String, Boolean, Integer, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from .base import Base


class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False)
    node_id = Column(String(255), nullable=False)
    job_name = Column(String(255), nullable=False)
    timer_type = Column(String(20), nullable=False)
    cron_expression = Column(String(100))
    interval_seconds = Column(Integer)
    delay_seconds = Column(Integer)
    timezone = Column(String(50), default='UTC')
    max_executions = Column(Integer, default=0)
    current_executions = Column(Integer, default=0)
    is_enabled = Column(Boolean, default=True)
    next_run_at = Column(TIMESTAMP(timezone=True))
    last_run_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    
    workflow = relationship("Workflow", back_populates="scheduled_jobs")
    job_executions = relationship("JobExecution", back_populates="scheduled_job", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_scheduled_jobs_workflow', 'workflow_id'),
        Index('idx_scheduled_jobs_next_run', 'next_run_at'),
        Index('idx_scheduled_jobs_enabled', 'is_enabled'),
        Index('idx_scheduled_jobs_type', 'timer_type'),
    )


class JobExecution(Base):
    __tablename__ = "job_executions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey('scheduled_jobs.id', ondelete='CASCADE'), nullable=False)
    execution_id = Column(UUID(as_uuid=True))
    started_at = Column(TIMESTAMP(timezone=True), default=func.now())
    completed_at = Column(TIMESTAMP(timezone=True))
    status = Column(String(20), default='running')
    result = Column(JSONB)
    error_message = Column(String)
    execution_time_ms = Column(Integer)
    
    scheduled_job = relationship("ScheduledJob", back_populates="job_executions")
    
    __table_args__ = (
        Index('idx_job_exec_job', 'job_id'),
        Index('idx_job_exec_started', 'started_at'),
        Index('idx_job_exec_status', 'status'),
    ) 