from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
from app.core.config import get_settings
from typing import Optional, Any
import os
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Celery configuration
def create_celery_app() -> Celery:
    """Create and configure Celery app"""
    
    # Redis connection URLs
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Create Celery instance
    celery_app = Celery(
        "flows_workers",
        broker=redis_url,
        backend=redis_url,
        include=[
            "app.tasks.workflow_tasks",
            "app.tasks.monitoring_tasks"
        ]
    )
    
    # Celery configuration
    celery_app.conf.update(
        # Task routing
        task_routes={
            "app.tasks.workflow_tasks.*": {"queue": "workflows"},
            "app.tasks.monitoring_tasks.*": {"queue": "monitoring"},
        },
        
        # Task execution
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        
        # Task result settings
        result_expires=3600,  # 1 hour
        result_backend_transport_options={
            "master_name": "mymaster",
            "visibility_timeout": 3600,
        },
        
        # Worker settings
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,
        worker_disable_rate_limits=True,
        
        # Task retry settings
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        
        # Monitoring
        task_send_sent_event=True,
        task_track_started=True,
        
        # Beat schedule (for periodic tasks)
        beat_schedule={
            "cleanup-old-tasks": {
                "task": "app.tasks.monitoring_tasks.cleanup_old_tasks",
                "schedule": 3600.0,  # Run every hour
            },
            "health-check": {
                "task": "app.tasks.monitoring_tasks.health_check",
                "schedule": 300.0,  # Run every 5 minutes
            },
        },
    )
    
    return celery_app

# Create global Celery instance
celery_app = create_celery_app()

# Task event handlers
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Handle task pre-run events"""
    task_name = getattr(task, 'name', 'unknown') if task else 'unknown'
    logger.info(f"Task {task_id} started: {task_name}")

@task_postrun.connect  
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
    """Handle task post-run events"""
    logger.info(f"Task {task_id} completed with state: {state}")

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, einfo=None, **kwds):
    """Handle task failure events"""
    logger.error(f"Task {task_id} failed: {exception}")

# Convenience function to get Celery app
def get_celery_app() -> Celery:
    """Get the configured Celery app instance"""
    return celery_app 