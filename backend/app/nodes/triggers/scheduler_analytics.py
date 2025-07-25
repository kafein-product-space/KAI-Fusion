"""
Scheduler Analytics and Monitoring Dashboard
──────────────────────────────────────────
• Purpose: Comprehensive analytics for scheduled workflow executions
• Features: Performance metrics, execution tracking, failure analysis
• Integration: Works with SchedulerTriggerNode and WorkflowExecutor
• Dashboard: Real-time monitoring and historical analytics
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

@dataclass
class ExecutionMetrics:
    """Metrics for a single workflow execution."""
    execution_id: str
    workflow_id: str
    trigger_type: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    success: bool
    error_message: Optional[str] = None
    steps_completed: int = 0
    total_steps: int = 0
    memory_usage_mb: Optional[float] = None
    cpu_usage_percent: Optional[float] = None
    
    @property
    def completion_rate(self) -> float:
        """Calculate step completion rate."""
        return (self.steps_completed / self.total_steps) if self.total_steps > 0 else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result['start_time'] = self.start_time.isoformat()
        result['end_time'] = self.end_time.isoformat()
        return result

@dataclass
class SchedulerPerformanceMetrics:
    """Performance metrics for scheduler operations."""
    workflow_id: str
    total_executions: int
    successful_executions: int
    failed_executions: int
    average_duration: float
    median_duration: float
    min_duration: float
    max_duration: float
    success_rate: float
    error_patterns: Dict[str, int]
    execution_frequency: Dict[str, int]  # Hour of day → execution count
    trigger_type_distribution: Dict[str, int]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)

class SchedulerAnalyticsCollector:
    """
    Collects and analyzes scheduler execution metrics.
    """
    
    def __init__(self, max_history_size: int = 10000):
        """
        Initialize analytics collector.
        
        Args:
            max_history_size: Maximum number of execution records to keep
        """
        self.max_history_size = max_history_size
        self.execution_history: List[ExecutionMetrics] = []
        self.workflow_metrics: Dict[str, SchedulerPerformanceMetrics] = {}
        self._metrics_cache: Dict[str, Any] = {}
        self._last_cache_update = datetime.min
        
        logger.info(f"📊 Scheduler Analytics initialized (max history: {max_history_size})")
    
    def record_execution(self, 
                        execution_id: str,
                        workflow_id: str,
                        trigger_type: str,
                        start_time: datetime,
                        end_time: datetime,
                        success: bool,
                        error_message: Optional[str] = None,
                        steps_completed: int = 0,
                        total_steps: int = 0,
                        system_metrics: Optional[Dict[str, Any]] = None) -> None:
        """
        Record a workflow execution for analytics.
        
        Args:
            execution_id: Unique execution identifier
            workflow_id: Workflow identifier
            trigger_type: Type of trigger (cron, interval, once, manual)
            start_time: Execution start time
            end_time: Execution end time
            success: Whether execution was successful
            error_message: Error message if failed
            steps_completed: Number of steps completed
            total_steps: Total number of steps
            system_metrics: Optional system performance metrics
        """
        duration = (end_time - start_time).total_seconds()
        
        # Extract system metrics
        memory_usage = None
        cpu_usage = None
        if system_metrics:
            memory_usage = system_metrics.get('memory_usage_mb')
            cpu_usage = system_metrics.get('cpu_usage_percent')
        
        # Create execution metrics
        metrics = ExecutionMetrics(
            execution_id=execution_id,
            workflow_id=workflow_id,
            trigger_type=trigger_type,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            success=success,
            error_message=error_message,
            steps_completed=steps_completed,
            total_steps=total_steps,
            memory_usage_mb=memory_usage,
            cpu_usage_percent=cpu_usage
        )
        
        # Add to history
        self.execution_history.append(metrics)
        
        # Maintain max history size
        if len(self.execution_history) > self.max_history_size:
            self.execution_history = self.execution_history[-self.max_history_size:]
        
        # Invalidate cache
        self._invalidate_cache()
        
        logger.debug(f"📝 Recorded execution: {execution_id} ({duration:.2f}s, {'✅' if success else '❌'})")
    
    def _invalidate_cache(self) -> None:
        """Invalidate metrics cache."""
        self._metrics_cache.clear()
        self._last_cache_update = datetime.min
    
    def get_workflow_performance(self, workflow_id: str, 
                                time_window_hours: Optional[int] = None) -> SchedulerPerformanceMetrics:
        """
        Get performance metrics for a specific workflow.
        
        Args:
            workflow_id: Workflow to analyze
            time_window_hours: Optional time window for analysis
            
        Returns:
            Performance metrics for the workflow
        """
        # Filter executions
        cutoff_time = None
        if time_window_hours:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
        
        workflow_executions = [
            exec_metrics for exec_metrics in self.execution_history
            if exec_metrics.workflow_id == workflow_id and
            (cutoff_time is None or exec_metrics.start_time >= cutoff_time)
        ]
        
        if not workflow_executions:
            return SchedulerPerformanceMetrics(
                workflow_id=workflow_id,
                total_executions=0,
                successful_executions=0,
                failed_executions=0,
                average_duration=0.0,
                median_duration=0.0,
                min_duration=0.0,
                max_duration=0.0,
                success_rate=0.0,
                error_patterns={},
                execution_frequency={},
                trigger_type_distribution={}
            )
        
        # Calculate basic metrics
        total_executions = len(workflow_executions)
        successful_executions = len([e for e in workflow_executions if e.success])
        failed_executions = total_executions - successful_executions
        success_rate = (successful_executions / total_executions) * 100
        
        # Duration statistics
        durations = [e.duration_seconds for e in workflow_executions]
        average_duration = statistics.mean(durations)
        median_duration = statistics.median(durations)
        min_duration = min(durations)
        max_duration = max(durations)
        
        # Error pattern analysis
        error_patterns = defaultdict(int)
        for execution in workflow_executions:
            if not execution.success and execution.error_message:
                # Categorize errors
                error_type = self._categorize_error(execution.error_message)
                error_patterns[error_type] += 1
        
        # Execution frequency by hour
        execution_frequency = defaultdict(int)
        for execution in workflow_executions:
            hour = execution.start_time.hour
            execution_frequency[str(hour)] += 1
        
        # Trigger type distribution
        trigger_type_distribution = defaultdict(int)
        for execution in workflow_executions:
            trigger_type_distribution[execution.trigger_type] += 1
        
        return SchedulerPerformanceMetrics(
            workflow_id=workflow_id,
            total_executions=total_executions,
            successful_executions=successful_executions,
            failed_executions=failed_executions,
            average_duration=average_duration,
            median_duration=median_duration,
            min_duration=min_duration,
            max_duration=max_duration,
            success_rate=success_rate,
            error_patterns=dict(error_patterns),
            execution_frequency=dict(execution_frequency),
            trigger_type_distribution=dict(trigger_type_distribution)
        )
    
    def _categorize_error(self, error_message: str) -> str:
        """Categorize error messages into common patterns."""
        error_lower = error_message.lower()
        
        if "timeout" in error_lower or "time out" in error_lower:
            return "timeout"
        elif "connection" in error_lower or "network" in error_lower:
            return "network"
        elif "authentication" in error_lower or "auth" in error_lower:
            return "authentication"
        elif "rate limit" in error_lower or "quota" in error_lower:
            return "rate_limit"
        elif "validation" in error_lower or "invalid" in error_lower:
            return "validation"
        elif "permission" in error_lower or "forbidden" in error_lower:
            return "permission"
        elif "not found" in error_lower or "404" in error_lower:
            return "not_found"
        elif "memory" in error_lower or "out of memory" in error_lower:
            return "memory"
        else:
            return "other"
    
    def get_system_health_metrics(self) -> Dict[str, Any]:
        """
        Get overall system health metrics.
        
        Returns:
            System health dashboard data
        """
        if not self.execution_history:
            return {
                "status": "no_data",
                "total_executions": 0,
                "recent_executions": 0,
                "system_load": "unknown"
            }
        
        now = datetime.now(timezone.utc)
        last_hour = now - timedelta(hours=1)
        last_24h = now - timedelta(hours=24)
        
        # Recent execution counts
        recent_executions = len([e for e in self.execution_history if e.start_time >= last_hour])
        daily_executions = len([e for e in self.execution_history if e.start_time >= last_24h])
        
        # Success rates
        recent_successful = len([e for e in self.execution_history 
                               if e.start_time >= last_hour and e.success])
        daily_successful = len([e for e in self.execution_history 
                              if e.start_time >= last_24h and e.success])
        
        recent_success_rate = (recent_successful / recent_executions * 100) if recent_executions > 0 else 100
        daily_success_rate = (daily_successful / daily_executions * 100) if daily_executions > 0 else 100
        
        # System load assessment
        if recent_executions > 50:  # More than 50 executions per hour
            system_load = "high"
        elif recent_executions > 10:
            system_load = "medium"
        else:
            system_load = "low"
        
        # Determine overall status
        if recent_success_rate >= 95 and daily_success_rate >= 90:
            status = "healthy"
        elif recent_success_rate >= 80 and daily_success_rate >= 75:
            status = "warning"
        else:
            status = "critical"
        
        return {
            "status": status,
            "total_executions": len(self.execution_history),
            "recent_executions": recent_executions,
            "daily_executions": daily_executions,
            "recent_success_rate": round(recent_success_rate, 1),
            "daily_success_rate": round(daily_success_rate, 1),
            "system_load": system_load,
            "active_workflows": len(set(e.workflow_id for e in self.execution_history)),
            "last_execution": self.execution_history[-1].start_time.isoformat() if self.execution_history else None
        }
    
    def get_trend_analysis(self, days: int = 7) -> Dict[str, Any]:
        """
        Get execution trend analysis over specified days.
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Trend analysis data
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=days)
        recent_executions = [e for e in self.execution_history if e.start_time >= cutoff_time]
        
        if not recent_executions:
            return {"message": "No recent executions for trend analysis"}
        
        # Group by day
        daily_stats = defaultdict(lambda: {"executions": 0, "successful": 0, "total_duration": 0.0})
        
        for execution in recent_executions:
            day_key = execution.start_time.date().isoformat()
            daily_stats[day_key]["executions"] += 1
            if execution.success:
                daily_stats[day_key]["successful"] += 1
            daily_stats[day_key]["total_duration"] += execution.duration_seconds
        
        # Calculate trends
        trend_data = []
        for day_key in sorted(daily_stats.keys()):
            stats = daily_stats[day_key]
            avg_duration = stats["total_duration"] / stats["executions"] if stats["executions"] > 0 else 0
            success_rate = (stats["successful"] / stats["executions"] * 100) if stats["executions"] > 0 else 0
            
            trend_data.append({
                "date": day_key,
                "executions": stats["executions"],
                "success_rate": round(success_rate, 1),
                "average_duration": round(avg_duration, 2)
            })
        
        return {
            "period_days": days,
            "daily_trends": trend_data,
            "total_executions": len(recent_executions),
            "period_success_rate": round(
                len([e for e in recent_executions if e.success]) / len(recent_executions) * 100, 1
            )
        }
    
    def generate_analytics_report(self, workflow_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate comprehensive analytics report.
        
        Args:
            workflow_id: Optional specific workflow to analyze
            
        Returns:
            Complete analytics report
        """
        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "system_health": self.get_system_health_metrics(),
            "trend_analysis": self.get_trend_analysis(),
        }
        
        if workflow_id:
            # Single workflow analysis
            report["workflow_performance"] = self.get_workflow_performance(workflow_id).to_dict()
        else:
            # All workflows analysis
            active_workflows = set(e.workflow_id for e in self.execution_history)
            report["workflows"] = {}
            
            for wf_id in active_workflows:
                report["workflows"][wf_id] = self.get_workflow_performance(wf_id).to_dict()
        
        return report
    
    def export_metrics(self, filepath: str) -> None:
        """
        Export metrics to JSON file.
        
        Args:
            filepath: Path to save the metrics file
        """
        export_data = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "execution_history": [metrics.to_dict() for metrics in self.execution_history],
            "analytics_report": self.generate_analytics_report()
        }
        
        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"📤 Metrics exported to: {filepath}")

class SchedulerMonitoringDashboard:
    """
    Real-time monitoring dashboard for scheduler analytics.
    """
    
    def __init__(self, analytics_collector: SchedulerAnalyticsCollector):
        """
        Initialize monitoring dashboard.
        
        Args:
            analytics_collector: Analytics collector instance
        """
        self.analytics = analytics_collector
        logger.info("📈 Scheduler Monitoring Dashboard initialized")
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        Get real-time dashboard data.
        
        Returns:
            Dashboard data for frontend display
        """
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system_health": self.analytics.get_system_health_metrics(),
            "recent_executions": self._get_recent_executions(limit=10),
            "active_workflows": self._get_active_workflows_summary(),
            "performance_alerts": self._check_performance_alerts(),
            "quick_stats": self._get_quick_stats()
        }
    
    def _get_recent_executions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most recent executions for dashboard."""
        recent = sorted(self.analytics.execution_history, 
                       key=lambda x: x.start_time, reverse=True)[:limit]
        return [exec_metrics.to_dict() for exec_metrics in recent]
    
    def _get_active_workflows_summary(self) -> List[Dict[str, Any]]:
        """Get summary of active workflows."""
        workflow_ids = set(e.workflow_id for e in self.analytics.execution_history)
        summaries = []
        
        for workflow_id in workflow_ids:
            metrics = self.analytics.get_workflow_performance(workflow_id, time_window_hours=24)
            summaries.append({
                "workflow_id": workflow_id,
                "executions_24h": metrics.total_executions,
                "success_rate": metrics.success_rate,
                "avg_duration": metrics.average_duration,
                "status": "healthy" if metrics.success_rate >= 90 else "warning" if metrics.success_rate >= 75 else "critical"
            })
        
        return sorted(summaries, key=lambda x: x["executions_24h"], reverse=True)
    
    def _check_performance_alerts(self) -> List[Dict[str, Any]]:
        """Check for performance alerts."""
        alerts = []
        health = self.analytics.get_system_health_metrics()
        
        # System health alerts
        if health["status"] == "critical":
            alerts.append({
                "type": "critical",
                "message": f"System health critical: {health['recent_success_rate']}% success rate",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        elif health["status"] == "warning":
            alerts.append({
                "type": "warning", 
                "message": f"System health warning: {health['recent_success_rate']}% success rate",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # High load alert
        if health["system_load"] == "high":
            alerts.append({
                "type": "info",
                "message": f"High system load: {health['recent_executions']} executions in last hour",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        return alerts
    
    def _get_quick_stats(self) -> Dict[str, Any]:
        """Get quick statistics for dashboard header."""
        health = self.analytics.get_system_health_metrics()
        
        return {
            "total_executions": health["total_executions"],
            "active_workflows": health["active_workflows"],
            "success_rate_24h": health["daily_success_rate"],
            "system_status": health["status"]
        }

# Global analytics instance (singleton pattern)
_global_analytics_collector: Optional[SchedulerAnalyticsCollector] = None

def get_analytics_collector() -> SchedulerAnalyticsCollector:
    """Get global analytics collector instance."""
    global _global_analytics_collector
    if _global_analytics_collector is None:
        _global_analytics_collector = SchedulerAnalyticsCollector()
    return _global_analytics_collector

def get_monitoring_dashboard() -> SchedulerMonitoringDashboard:
    """Get monitoring dashboard instance."""
    collector = get_analytics_collector()
    return SchedulerMonitoringDashboard(collector)

# Export for use
__all__ = [
    "ExecutionMetrics",
    "SchedulerPerformanceMetrics", 
    "SchedulerAnalyticsCollector",
    "SchedulerMonitoringDashboard",
    "get_analytics_collector",
    "get_monitoring_dashboard"
]