"""
Simple test script to verify that the merged tracing module works as expected.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.tracing import WorkflowTracer, get_workflow_tracer, setup_tracing

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

def test_setup_tracing():
    """Test that setup_tracing function works."""
    try:
        setup_tracing()
        print("✓ setup_tracing function test passed")
    except Exception as e:
        print(f"✗ setup_tracing function test failed: {e}")

if __name__ == "__main__":
    print("Running simple tracing module tests...")
    
    test_workflow_tracer_creation()
    test_get_workflow_tracer()
    test_setup_tracing()
    
    print("All simple tests completed!")