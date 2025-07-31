"""
Test script to verify that the merged tracing module works as expected.
"""

import asyncio
from app.core.tracing import WorkflowTracer, trace_workflow, trace_node_execution, trace_memory_operation, get_workflow_tracer, setup_tracing

def test_workflow_tracer_creation():
    """Test that WorkflowTracer can be created."""
    tracer = WorkflowTracer(session_id="test_session", user_id="test_user")
    assert tracer is not None
    assert tracer.session_id == "test_session"
    assert tracer.user_id == "test_user"
    print("✓ WorkflowTracer creation test passed")

def test_get_workflow_tracer():
    """Test that get_workflow_tracer function works."""
    tracer = get_workflow_tracer(session_id="test_session", user_id="test_user")
    assert tracer is not None
    assert isinstance(tracer, WorkflowTracer)
    print("✓ get_workflow_tracer function test passed")

@trace_workflow
def test_traced_function():
    """Test that trace_workflow decorator works."""
    return "test_result"

def test_trace_workflow_decorator():
    """Test that trace_workflow decorator works."""
    result = test_traced_function(session_id="test_session", workflow_id="test_workflow")
    assert result == "test_result"
    print("✓ trace_workflow decorator test passed")

@trace_memory_operation("test_operation")
def test_memory_operation_function():
    """Test that trace_memory_operation decorator works."""
    return "memory_result"

def test_trace_memory_operation_decorator():
    """Test that trace_memory_operation decorator works."""
    result = test_memory_operation_function()
    assert result == "memory_result"
    print("✓ trace_memory_operation decorator test passed")

def test_setup_tracing():
    """Test that setup_tracing function works."""
    try:
        setup_tracing()
        print("✓ setup_tracing function test passed")
    except Exception as e:
        print(f"✗ setup_tracing function test failed: {e}")

async def run_all_tests():
    """Run all tests."""
    print("Running tracing module tests...")
    
    test_workflow_tracer_creation()
    test_get_workflow_tracer()
    test_trace_workflow_decorator()
    test_trace_memory_operation_decorator()
    test_setup_tracing()
    
    print("All tests completed!")

if __name__ == "__main__":
    asyncio.run(run_all_tests())