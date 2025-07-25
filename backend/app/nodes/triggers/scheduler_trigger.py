"""
Advanced Scheduler Trigger Node - LangChain Native Workflow Automation
─────────────────────────────────────────────────────────────────────
• Purpose: Schedule and trigger workflow executions automatically
• Integration: Full LangChain Runnable with LangSmith tracing support
• Features: Cron expressions, intervals, one-time scheduling, timezone support
• UI: Advanced scheduling controls with visual feedback and validation
• Monitoring: Comprehensive execution tracking and failure handling
"""

from __future__ import annotations

import os
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, AsyncGenerator, Union
import uuid

from croniter import croniter
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.job import Job

from langchain_core.runnables import Runnable, RunnableLambda, RunnableConfig
from langchain_core.runnables.utils import Input, Output

from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# LangSmith tracing configuration
ENABLE_TRACING = bool(os.getenv("LANGCHAIN_TRACING_V2", ""))
def get_run_config(name: str) -> Optional[RunnableConfig]:
    """Get LangSmith run configuration if tracing is enabled."""
    return RunnableConfig(run_name=name) if ENABLE_TRACING else None

# Scheduling strategies available
SCHEDULING_STRATEGIES = {
    "cron": {
        "name": "Cron Expression",
        "description": "Unix-style cron scheduling with full flexibility",
        "examples": [
            "0 9 * * MON-FRI (9 AM weekdays)",
            "*/15 * * * * (every 15 minutes)",
            "0 0 1 * * (monthly on 1st)",
        ],
        "supports_timezone": True,
    },
    "interval": {
        "name": "Fixed Interval",
        "description": "Repeat at fixed time intervals",
        "examples": [
            "Every 30 seconds",
            "Every 5 minutes", 
            "Every 2 hours",
        ],
        "supports_timezone": False,
    },
    "once": {
        "name": "One-time Execution", 
        "description": "Execute once at specified date/time",
        "examples": [
            "2025-01-25 14:30:00",
            "Tomorrow at 9 AM",
            "Next Monday 18:00",
        ],
        "supports_timezone": True,
    },
    "manual": {
        "name": "Manual Trigger",
        "description": "Execute immediately when workflow runs",
        "examples": [
            "Immediate execution",
            "On-demand trigger",
        ],
        "supports_timezone": False,
    },
}

# Common timezone mappings
COMMON_TIMEZONES = {
    "UTC": "UTC",
    "US/Eastern": "America/New_York",
    "US/Central": "America/Chicago", 
    "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles",
    "Europe/London": "Europe/London",
    "Europe/Paris": "Europe/Paris",
    "Asia/Tokyo": "Asia/Tokyo",
    "Australia/Sydney": "Australia/Sydney",
}

class CronRunnable(Runnable[None, Dict[str, Any]]):
    """LangChain-native async cron scheduler runnable."""
    
    def __init__(self, cron_expr: str, timezone_str: str = "UTC", max_executions: Optional[int] = None):
        """
        Initialize cron runnable.
        
        Args:
            cron_expr: Cron expression (e.g., "0 9 * * MON-FRI")
            timezone_str: Timezone for execution
            max_executions: Maximum number of executions (None for unlimited)
        """
        self.cron_expr = cron_expr
        self.timezone_str = timezone_str
        self.max_executions = max_executions
        self.execution_count = 0
    
    def invoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Single execution (for immediate trigger)."""
        now = datetime.now(timezone.utc)
        return {
            "trigger_type": "cron_immediate",
            "execution_time": now.isoformat(),
            "cron_expression": self.cron_expr,
            "timezone": self.timezone_str,
            "execution_count": self.execution_count + 1,
        }
    
    async def ainvoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Async single execution."""
        return self.invoke(input, config)
    
    async def astream(self, input: None, config: Optional[RunnableConfig] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream scheduled executions based on cron expression."""
        logger.info(f"🕒 Starting cron scheduler: {self.cron_expr} (timezone: {self.timezone_str})")
        
        # Initialize croniter with timezone
        base_time = datetime.now()
        if self.timezone_str != "UTC":
            import pytz
            tz = pytz.timezone(self.timezone_str)
            base_time = tz.localize(base_time)
        
        cron_iter = croniter(self.cron_expr, base_time)
        
        while True:
            # Check execution limit
            if self.max_executions and self.execution_count >= self.max_executions:
                logger.info(f"✅ Cron scheduler completed: reached max executions ({self.max_executions})")
                break
            
            # Get next execution time
            next_time = cron_iter.get_next(datetime)
            current_time = datetime.now()
            
            # Calculate sleep duration
            sleep_duration = (next_time - current_time).total_seconds()
            
            if sleep_duration > 0:
                logger.info(f"⏰ Next execution in {sleep_duration:.1f} seconds at {next_time}")
                await asyncio.sleep(sleep_duration)
            
            # Execute
            self.execution_count += 1
            execution_time = datetime.now(timezone.utc)
            
            trigger_data = {
                "trigger_type": "cron_scheduled",
                "execution_time": execution_time.isoformat(),
                "scheduled_time": next_time.isoformat(),
                "cron_expression": self.cron_expr,
                "timezone": self.timezone_str,
                "execution_count": self.execution_count,
                "max_executions": self.max_executions,
            }
            
            logger.info(f"🔥 Cron trigger fired: execution #{self.execution_count}")
            yield trigger_data

class IntervalRunnable(Runnable[None, Dict[str, Any]]):
    """LangChain-native interval scheduler runnable."""
    
    def __init__(self, seconds: int, max_executions: Optional[int] = None):
        """
        Initialize interval runnable.
        
        Args:
            seconds: Interval between executions in seconds
            max_executions: Maximum number of executions (None for unlimited)
        """
        self.seconds = seconds
        self.max_executions = max_executions
        self.execution_count = 0
    
    def invoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Single execution (for immediate trigger)."""
        now = datetime.now(timezone.utc)
        return {
            "trigger_type": "interval_immediate",
            "execution_time": now.isoformat(),
            "interval_seconds": self.seconds,
            "execution_count": self.execution_count + 1,
        }
    
    async def ainvoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Async single execution."""
        return self.invoke(input, config)
    
    async def astream(self, input: None, config: Optional[RunnableConfig] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream executions at fixed intervals."""
        logger.info(f"⏱️ Starting interval scheduler: every {self.seconds} seconds")
        
        while True:
            # Check execution limit
            if self.max_executions and self.execution_count >= self.max_executions:
                logger.info(f"✅ Interval scheduler completed: reached max executions ({self.max_executions})")
                break
            
            # Wait for interval
            if self.execution_count > 0:  # Skip initial wait
                await asyncio.sleep(self.seconds)
            
            # Execute
            self.execution_count += 1
            execution_time = datetime.now(timezone.utc)
            
            trigger_data = {
                "trigger_type": "interval_scheduled",
                "execution_time": execution_time.isoformat(),
                "interval_seconds": self.seconds,
                "execution_count": self.execution_count,
                "max_executions": self.max_executions,
            }
            
            logger.info(f"🔥 Interval trigger fired: execution #{self.execution_count}")
            yield trigger_data

class OnceRunnable(Runnable[None, Dict[str, Any]]):
    """LangChain-native one-time scheduler runnable."""
    
    def __init__(self, target_datetime: datetime, timezone_str: str = "UTC"):
        """
        Initialize one-time runnable.
        
        Args:
            target_datetime: When to execute
            timezone_str: Timezone for execution
        """
        self.target_datetime = target_datetime
        self.timezone_str = timezone_str
        self.executed = False
    
    def invoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Single execution (for immediate trigger)."""
        now = datetime.now(timezone.utc)
        self.executed = True
        return {
            "trigger_type": "once_immediate",
            "execution_time": now.isoformat(),
            "target_datetime": self.target_datetime.isoformat(),
            "timezone": self.timezone_str,
            "executed": True,
        }
    
    async def ainvoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Async single execution."""
        return self.invoke(input, config)
    
    async def astream(self, input: None, config: Optional[RunnableConfig] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Wait until target time and execute once."""
        if self.executed:
            logger.warning("⚠️ Once scheduler already executed")
            return
        
        current_time = datetime.now()
        sleep_duration = (self.target_datetime - current_time).total_seconds()
        
        if sleep_duration <= 0:
            logger.warning("⚠️ Target time is in the past, executing immediately")
            sleep_duration = 0
        else:
            logger.info(f"⏰ Waiting {sleep_duration:.1f} seconds until {self.target_datetime}")
        
        await asyncio.sleep(sleep_duration)
        
        # Execute once
        self.executed = True
        execution_time = datetime.now(timezone.utc)
        
        trigger_data = {
            "trigger_type": "once_scheduled",
            "execution_time": execution_time.isoformat(),
            "target_datetime": self.target_datetime.isoformat(),
            "timezone": self.timezone_str,
            "executed": True,
        }
        
        logger.info(f"🔥 One-time trigger fired at {execution_time}")
        yield trigger_data

class ManualRunnable(Runnable[None, Dict[str, Any]]):
    """LangChain-native manual trigger runnable."""
    
    def __init__(self):
        """Initialize manual runnable."""
        self.execution_count = 0
    
    def invoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Execute immediately."""
        self.execution_count += 1
        now = datetime.now(timezone.utc)
        return {
            "trigger_type": "manual",
            "execution_time": now.isoformat(),
            "execution_count": self.execution_count,
        }
    
    async def ainvoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """Async execution."""
        return self.invoke(input, config)

class SchedulerTriggerNode(ProviderNode):
    """
    Advanced scheduler trigger node with comprehensive timing strategies.
    Provides LangChain-native Runnable for workflow automation.
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "SchedulerTrigger",
            "display_name": "Workflow Scheduler",
            "description": (
                "Advanced workflow scheduler with multiple timing strategies. "
                "Supports cron expressions, fixed intervals, one-time execution, "
                "and manual triggers with full LangChain integration."
            ),
            "category": NodeCategory.UTILITY,
            "node_type": NodeType.PROVIDER,
            "icon": "clock",
            "color": "#8b5cf6",
            
            # Comprehensive scheduling inputs
            "inputs": [
                # Scheduling Strategy
                NodeInput(
                    name="schedule_type",
                    type="select",
                    description="Scheduling strategy to use",
                    choices=[
                        {
                            "value": strategy_id,
                            "label": strategy_info["name"],
                            "description": strategy_info["description"]
                        }
                        for strategy_id, strategy_info in SCHEDULING_STRATEGIES.items()
                    ],
                    default="manual",
                    required=True,
                ),
                
                # Cron Configuration
                NodeInput(
                    name="cron_expression",
                    type="text",
                    description="Cron expression (e.g., '0 9 * * MON-FRI' for 9 AM weekdays)",
                    default="0 */1 * * *",
                    required=False,
                ),
                
                # Interval Configuration
                NodeInput(
                    name="interval_seconds",
                    type="slider",
                    description="Interval between executions (seconds)",
                    default=3600,
                    min_value=10,
                    max_value=86400,  # 1 day
                    step=10,
                    required=False,
                ),
                
                # One-time Configuration
                NodeInput(
                    name="target_datetime",
                    type="datetime",
                    description="Target date and time for one-time execution",
                    required=False,
                ),
                
                # Timezone Configuration
                NodeInput(
                    name="timezone",
                    type="select",
                    description="Timezone for scheduling",
                    choices=[
                        {"value": k, "label": f"{k} ({v})", "description": v}
                        for k, v in COMMON_TIMEZONES.items()
                    ],
                    default="UTC",
                    required=False,
                ),
                
                # Execution Limits
                NodeInput(
                    name="max_executions",
                    type="number",
                    description="Maximum number of executions (0 for unlimited)",
                    default=0,
                    min_value=0,
                    max_value=10000,
                    required=False,
                ),
                
                # Advanced Options
                NodeInput(
                    name="enable_tracing",
                    type="boolean",
                    description="Enable LangSmith tracing for scheduler",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="jitter_seconds",
                    type="slider",
                    description="Random jitter to add to execution times (seconds)",
                    default=0,
                    min_value=0,
                    max_value=300,
                    step=5,
                    required=False,
                ),
            ],
            
            # Scheduler outputs
            "outputs": [
                NodeOutput(
                    name="scheduler_runnable",
                    type="runnable",
                    description="LangChain Runnable for workflow scheduling",
                ),
                NodeOutput(
                    name="schedule_config",
                    type="dict",
                    description="Scheduler configuration and metadata",
                ),
                NodeOutput(
                    name="next_executions",
                    type="list",
                    description="Preview of next scheduled execution times",
                ),
            ],
        }
    
    def _validate_cron_expression(self, cron_expr: str) -> bool:
        """Validate cron expression syntax."""
        try:
            croniter(cron_expr)
            return True
        except Exception:
            return False
    
    def _parse_datetime(self, datetime_str: str, timezone_str: str) -> Optional[datetime]:
        """Parse datetime string with timezone support."""
        try:
            # Try different datetime formats
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d %H:%M",
                "%Y-%m-%d",
                "%m/%d/%Y %H:%M:%S",
                "%m/%d/%Y %H:%M",
                "%m/%d/%Y",
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(datetime_str, fmt)
                    if timezone_str != "UTC":
                        import pytz
                        tz = pytz.timezone(COMMON_TIMEZONES[timezone_str])
                        dt = tz.localize(dt)
                    return dt
                except ValueError:
                    continue
            
            return None
        except Exception:
            return None
    
    def _get_next_executions(self, schedule_type: str, config: Dict[str, Any], count: int = 5) -> List[Dict[str, Any]]:
        """Get preview of next execution times."""
        executions = []
        
        try:
            if schedule_type == "cron":
                cron_expr = config.get("cron_expression", "0 */1 * * *")
                timezone_str = config.get("timezone", "UTC")
                
                if not self._validate_cron_expression(cron_expr):
                    return [{"error": "Invalid cron expression"}]
                
                base_time = datetime.now()
                cron_iter = croniter(cron_expr, base_time)
                
                for i in range(count):
                    next_time = cron_iter.get_next(datetime)
                    executions.append({
                        "execution_number": i + 1,
                        "scheduled_time": next_time.isoformat(),
                        "timezone": timezone_str,
                        "type": "cron",
                    })
            
            elif schedule_type == "interval":
                interval_seconds = config.get("interval_seconds", 3600)
                current_time = datetime.now()
                
                for i in range(count):
                    next_time = current_time + timedelta(seconds=interval_seconds * (i + 1))
                    executions.append({
                        "execution_number": i + 1,
                        "scheduled_time": next_time.isoformat(),
                        "interval_seconds": interval_seconds,
                        "type": "interval",
                    })
            
            elif schedule_type == "once":
                target_datetime_str = config.get("target_datetime")
                timezone_str = config.get("timezone", "UTC")
                
                if target_datetime_str:
                    target_dt = self._parse_datetime(target_datetime_str, timezone_str)
                    if target_dt:
                        executions.append({
                            "execution_number": 1,
                            "scheduled_time": target_dt.isoformat(),
                            "timezone": timezone_str,
                            "type": "once",
                        })
                    else:
                        executions.append({"error": "Invalid datetime format"})
            
            elif schedule_type == "manual":
                executions.append({
                    "execution_number": 1,
                    "scheduled_time": "On workflow execution",
                    "type": "manual",
                })
        
        except Exception as e:
            executions.append({"error": f"Failed to calculate executions: {str(e)}"})
        
        return executions
    
    def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Create scheduler runnable based on configuration.
        
        Returns:
            Dict with scheduler_runnable, config, and next_executions
        """
        logger.info("🔄 Creating Scheduler Trigger")
        
        # Get configuration
        schedule_type = kwargs.get("schedule_type", "manual")
        timezone_str = kwargs.get("timezone", "UTC")
        max_executions = int(kwargs.get("max_executions", 0)) or None
        enable_tracing = kwargs.get("enable_tracing", True)
        
        # Validate timezone
        if timezone_str not in COMMON_TIMEZONES:
            raise ValueError(f"Unsupported timezone: {timezone_str}")
        
        logger.info(f"⚙️ Configuration: {SCHEDULING_STRATEGIES[schedule_type]['name']} (timezone: {timezone_str})")
        
        try:
            # Create appropriate runnable based on schedule type
            if schedule_type == "cron":
                cron_expr = kwargs.get("cron_expression", "0 */1 * * *")
                if not self._validate_cron_expression(cron_expr):
                    raise ValueError(f"Invalid cron expression: {cron_expr}")
                
                scheduler_runnable = CronRunnable(
                    cron_expr=cron_expr,
                    timezone_str=timezone_str,
                    max_executions=max_executions,
                )
                logger.info(f"✅ Cron scheduler created: {cron_expr}")
            
            elif schedule_type == "interval":
                interval_seconds = int(kwargs.get("interval_seconds", 3600))
                if interval_seconds < 1:
                    raise ValueError("Interval must be at least 1 second")
                
                scheduler_runnable = IntervalRunnable(
                    seconds=interval_seconds,
                    max_executions=max_executions,
                )
                logger.info(f"✅ Interval scheduler created: every {interval_seconds} seconds")
            
            elif schedule_type == "once":
                target_datetime_str = kwargs.get("target_datetime")
                if not target_datetime_str:
                    raise ValueError("Target datetime is required for one-time execution")
                
                target_dt = self._parse_datetime(target_datetime_str, timezone_str)
                if not target_dt:
                    raise ValueError(f"Invalid datetime format: {target_datetime_str}")
                
                scheduler_runnable = OnceRunnable(
                    target_datetime=target_dt,
                    timezone_str=timezone_str,
                )
                logger.info(f"✅ One-time scheduler created: {target_dt}")
            
            elif schedule_type == "manual":
                scheduler_runnable = ManualRunnable()
                logger.info("✅ Manual trigger created")
            
            else:
                raise ValueError(f"Unsupported schedule type: {schedule_type}")
            
            # Wrap with tracing if enabled
            if enable_tracing and ENABLE_TRACING:
                config = get_run_config(f"SchedulerTrigger_{schedule_type}")
                if config:
                    scheduler_runnable = scheduler_runnable.with_config(config)
            
            # Generate schedule configuration
            schedule_config = {
                "schedule_type": schedule_type,
                "strategy_name": SCHEDULING_STRATEGIES[schedule_type]["name"],
                "timezone": timezone_str,
                "max_executions": max_executions,
                "enable_tracing": enable_tracing,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            
            # Add type-specific config
            if schedule_type == "cron":
                schedule_config["cron_expression"] = kwargs.get("cron_expression")
            elif schedule_type == "interval":
                schedule_config["interval_seconds"] = kwargs.get("interval_seconds")
            elif schedule_type == "once":
                schedule_config["target_datetime"] = kwargs.get("target_datetime")
            
            # Get next execution preview
            next_executions = self._get_next_executions(schedule_type, kwargs)
            
            logger.info(f"✅ Scheduler Trigger ready: {SCHEDULING_STRATEGIES[schedule_type]['name']}")
            
            return {
                "scheduler_runnable": scheduler_runnable,
                "schedule_config": schedule_config,
                "next_executions": next_executions,
            }
            
        except Exception as e:
            error_msg = f"Scheduler Trigger creation failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e
    
    def as_runnable(self) -> Runnable:
        """
        Convert node to LangChain Runnable for direct composition.
        
        Returns:
            RunnableLambda that executes the scheduler trigger
        """
        return RunnableLambda(
            lambda params: self.execute(**params),
            name="SchedulerTrigger",
        )


# Export for node registry
__all__ = ["SchedulerTriggerNode", "CronRunnable", "IntervalRunnable", "OnceRunnable", "ManualRunnable"]