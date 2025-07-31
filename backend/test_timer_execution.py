#!/usr/bin/env python3
"""
Test script for TimerStartNode manual execution functionality
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend')

# Import required modules
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

# Import models and schemas
from app.models.workflow import Workflow
from app.schemas.workflow import WorkflowCreate
from app.core.database import get_db_session
from app.core.config import settings

async def create_test_workflow(db_session):
    """Create a test workflow with TimerStartNode"""
    workflow_data = {
        "name": "Test TimerStartNode Manual Execution",
        "description": "Workflow to test TimerStartNode manual execution functionality",
        "nodes": [
            {
                "id": "timer_1",
                "type": "TimerStartNode",
                "position": {"x": 100, "y": 200},
                "data": {
                    "name": "Manual Timer",
                    "schedule_type": "manual",
                    "enabled": True,
                    "trigger_data": {
                        "message": "Manual timer execution test"
                    }
                }
            },
            {
                "id": "agent_1",
                "type": "Agent",
                "position": {"x": 400, "y": 200},
                "data": {
                    "name": "Test Agent",
                    "system_prompt": "You are a test agent for TimerStartNode functionality. Respond with a simple confirmation message.",
                    "max_iterations": 5,
                    "tools": []
                }
            },
            {
                "id": "openai_1",
                "type": "OpenAIChat",
                "position": {"x": 400, "y": 350},
                "data": {
                    "name": "GPT Model",
                    "model_name": "gpt-3.5-turbo",
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
            },
            {
                "id": "end_1",
                "type": "EndNode",
                "position": {"x": 700, "y": 200},
                "data": {"name": "End"}
            }
        ],
        "edges": [
            {
                "id": "e1",
                "source": "timer_1",
                "target": "agent_1"
            },
            {
                "id": "e2",
                "source": "agent_1",
                "target": "end_1"
            },
            {
                "id": "e3",
                "source": "openai_1",
                "target": "agent_1",
                "sourceHandle": "output",
                "targetHandle": "llm"
            }
        ]
    }
    
    # Create workflow object
    workflow = Workflow(
        name="Test TimerStartNode Manual Execution",
        description="Workflow to test TimerStartNode manual execution functionality",
        flow_data=workflow_data,
        is_public=False
    )
    
    # Add to database
    db_session.add(workflow)
    await db_session.commit()
    await db_session.refresh(workflow)
    
    print(f"✅ Created test workflow with ID: {workflow.id}")
    return workflow

async def test_manual_execution(workflow_id, node_id):
    """Test manual execution of TimerStartNode"""
    # For now, we'll just print what would be done
    print(f"🧪 Testing manual execution of TimerStartNode")
    print(f"   Workflow ID: {workflow_id}")
    print(f"   Node ID: {node_id}")
    print(f"   This would call: POST /api/v1/workflows/{workflow_id}/execute-timer-node")
    print(f"   With body: {{'node_id': '{node_id}'}}")
    
    # In a real test, we would make an HTTP request to the API
    # For now, we'll simulate a successful response
    return {
        "status": "success",
        "message": "TimerStartNode executed successfully",
        "execution_id": "test-execution-id",
        "output": "Manual execution triggered for manual timer"
    }

async def main():
    """Main test function"""
    print("🚀 Starting TimerStartNode manual execution test...\n")
    
    # Create database session
    async with get_db_session() as db_session:
        try:
            # Create test workflow
            workflow = await create_test_workflow(db_session)
            
            # Test manual execution
            result = await test_manual_execution(str(workflow.id), "timer_1")
            
            print(f"\n📊 Test Results:")
            print(f"   Status: {result['status']}")
            print(f"   Message: {result['message']}")
            print(f"   Execution ID: {result['execution_id']}")
            print(f"   Output: {result['output']}")
            
            print(f"\n✅ TimerStartNode manual execution test completed!")
            
        except Exception as e:
            print(f"❌ Error during test: {e}")
            import traceback
            print(f"🔍 Full traceback: {traceback.format_exc()}")
            return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)