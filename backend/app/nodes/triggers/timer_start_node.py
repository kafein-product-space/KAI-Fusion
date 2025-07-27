"""Timer Start Node - Scheduled trigger that initiates workflows."""

import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.nodes.base import TerminatorNode, NodeInput, NodeOutput, NodeType
from app.core.state import FlowState


class TimerStartNode(TerminatorNode):
    """
    Timer start node that can be triggered by scheduled events.
    This node acts as a LangGraph __start__ node but with scheduling capabilities.
    """

    def __init__(self):
        super().__init__()
        self.timer_id = f"timer_{uuid.uuid4().hex[:8]}"
        
        self._metadata = {
            "name": "TimerStartNode",
            "display_name": "Timer Start",
            "description": "Start workflow on schedule or timer events",
            "node_type": NodeType.TERMINATOR,
            "category": "Triggers",
            "inputs": [
                NodeInput(
                    name="schedule_type",
                    type="select",
                    description="Type of schedule",
                    default="interval",
                    required=False,
                    choices=["interval", "cron", "once", "manual"]
                ),
                NodeInput(
                    name="interval_seconds",
                    type="int",
                    description="Interval in seconds (for interval type)",
                    default=3600,  # 1 hour
                    required=False,
                    min_value=60,  # 1 minute minimum
                    max_value=86400  # 1 day maximum
                ),
                NodeInput(
                    name="cron_expression",
                    type="string",
                    description="Cron expression (for cron type)",
                    default="0 */1 * * *",  # Every hour
                    required=False
                ),
                NodeInput(
                    name="scheduled_time",
                    type="string",
                    description="Specific time to run (ISO format for once type)",
                    default="",
                    required=False
                ),
                NodeInput(
                    name="timezone",
                    type="string",
                    description="Timezone for scheduling",
                    default="UTC",
                    required=False
                ),
                NodeInput(
                    name="enabled",
                    type="bool",
                    description="Enable/disable the timer",
                    default=True,
                    required=False
                ),
                NodeInput(
                    name="trigger_data",
                    type="object",
                    description="Data to pass when timer triggers",
                    default={},
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="timer_data",
                    type="object",
                    description="Timer trigger information"
                ),
                NodeOutput(
                    name="schedule_info",
                    type="object",
                    description="Schedule configuration and next run time"
                )
            ],
            "color": "#10b981",  # Green color for timer
            "icon": "clock"
        }

    def _execute(self, state: FlowState) -> Dict[str, Any]:
        """
        Execute the timer start node.
        
        Args:
            state: Current workflow state
            
        Returns:
            Dict containing the timer trigger data and metadata
        """
        # Get timer configuration
        schedule_type = self.user_data.get("schedule_type", "interval")
        interval_seconds = self.user_data.get("interval_seconds", 3600)
        trigger_data = self.user_data.get("trigger_data", {})
        enabled = self.user_data.get("enabled", True)
        
        # Calculate next run time based on schedule type
        now = datetime.now()
        if schedule_type == "interval":
            next_run = now + timedelta(seconds=interval_seconds)
        elif schedule_type == "cron":
            # For now, approximate next run (in production, use croniter)
            next_run = now + timedelta(hours=1)
        elif schedule_type == "once":
            scheduled_time = self.user_data.get("scheduled_time", "")
            if scheduled_time:
                try:
                    next_run = datetime.fromisoformat(scheduled_time)
                except:
                    next_run = now + timedelta(minutes=5)
            else:
                next_run = now + timedelta(minutes=5)
        else:  # manual
            next_run = None
        
        # Create timer data
        timer_data = {
            "timer_id": self.timer_id,
            "triggered_at": now.isoformat(),
            "schedule_type": schedule_type,
            "trigger_data": trigger_data,
            "enabled": enabled
        }
        
        # Set initial input from trigger data or default message
        if trigger_data:
            initial_input = trigger_data.get("message", "Timer triggered")
        else:
            initial_input = f"Timer workflow started ({schedule_type})"
        
        # Update state
        state.last_output = str(initial_input)
        
        # Add this node to executed nodes list
        if self.node_id and self.node_id not in state.executed_nodes:
            state.executed_nodes.append(self.node_id)
        
        print(f"[TimerStartNode] Timer {self.timer_id} triggered: {initial_input}")
        
        return {
            "timer_data": timer_data,
            "schedule_info": {
                "schedule_type": schedule_type,
                "next_run": next_run.isoformat() if next_run else None,
                "interval_seconds": interval_seconds if schedule_type == "interval" else None,
                "cron_expression": self.user_data.get("cron_expression") if schedule_type == "cron" else None,
                "enabled": enabled
            },
            "output": initial_input,
            "status": "timer_triggered"
        }

    def get_next_run_time(self) -> Optional[datetime]:
        """Calculate the next run time based on schedule configuration."""
        schedule_type = self.user_data.get("schedule_type", "interval")
        
        if not self.user_data.get("enabled", True):
            return None
        
        now = datetime.now()
        
        if schedule_type == "interval":
            interval_seconds = self.user_data.get("interval_seconds", 3600)
            return now + timedelta(seconds=interval_seconds)
        elif schedule_type == "once":
            scheduled_time = self.user_data.get("scheduled_time", "")
            if scheduled_time:
                try:
                    return datetime.fromisoformat(scheduled_time)
                except:
                    return None
        elif schedule_type == "cron":
            # In production, use croniter library for proper cron calculation
            return now + timedelta(hours=1)  # Placeholder
        
        return None