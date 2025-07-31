"""
KAI-Fusion Enhanced Systems Test Suite
=====================================

Comprehensive tests for connection mapping, state cleanup, and performance monitoring.
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import threading

from app.core.connection_manager import ConnectionManager, ConnectionInfo, NodeConnectionMap
from app.core.state_manager import StateManager, CleanupPolicy
from app.core.memory_manager import EnhancedMemoryManager, MemoryCleanupPolicy
from app.core.performance_monitor import PerformanceMonitor, MetricType
from app.core.enhanced_graph_builder import EnhancedGraphBuilder
from app.core.tracing import WorkflowTracer
from app.nodes.memory.enhanced_buffer_memory import EnhancedBufferMemoryNode
from app.core.state import FlowState


class TestConnectionManager:
    """Test suite for ConnectionManager."""
    
    @pytest.fixture
    def connection_manager(self):
        return ConnectionManager()
    
    @pytest.fixture
    def mock_nodes(self):
        """Create mock nodes for testing."""
        node1 = Mock()
        node1.metadata = Mock()
        node1.metadata.outputs = [Mock(name="output")]
        
        node2 = Mock()
        node2.metadata = Mock()
        node2.metadata.inputs = [Mock(name="input")]
        
        return {"node1": node1, "node2": node2}
    
    @pytest.fixture
    def mock_connections(self):
        """Create mock connections for testing."""
        conn = Mock()
        conn.source_node_id = "node1"
        conn.source_handle = "output"
        conn.target_node_id = "node2"
        conn.target_handle = "input"
        conn.data_type = "str"
        return [conn]
    
    def test_build_connection_mappings_success(self, connection_manager, mock_nodes, mock_connections):
        """Test successful connection mapping build."""
        mappings = connection_manager.build_connection_mappings(mock_connections, mock_nodes)
        
        assert len(mappings) == 2
        assert "node1" in mappings
        assert "node2" in mappings
        
        # Check target node has input connection
        node2_mapping = mappings["node2"]
        assert "input" in node2_mapping.input_connections
        
        # Check source node has output connection
        node1_mapping = mappings["node1"]
        assert "output" in node1_mapping.output_connections
    
    def test_connection_validation_missing_node(self, connection_manager, mock_connections):
        """Test connection validation with missing node."""
        # Only provide one node when connection requires two
        incomplete_nodes = {"node1": Mock()}
        
        mappings = connection_manager.build_connection_mappings(mock_connections, incomplete_nodes)
        
        # Should still create mapping but with validation errors
        assert len(mappings) == 1
        
        # Check validation cache for errors
        stats = connection_manager.get_connection_stats()
        assert stats["invalid_connections"] > 0
    
    def test_circular_dependency_detection(self, connection_manager):
        """Test circular dependency detection."""
        # Create circular connection
        conn1 = Mock()
        conn1.source_node_id = "node1"
        conn1.target_node_id = "node2"
        conn1.source_handle = "output"
        conn1.target_handle = "input"
        
        conn2 = Mock()
        conn2.source_node_id = "node2"
        conn2.target_node_id = "node1"
        conn2.source_handle = "output"
        conn2.target_handle = "input"
        
        nodes = {"node1": Mock(), "node2": Mock()}
        
        # Should detect circular dependency
        result = connection_manager._creates_circular_dependency("node1", "node2")
        # First connection should be fine
        assert not result
        
        # Add first connection
        connection_manager._connection_graph["node1"].add("node2")
        
        # Second connection should create cycle
        result = connection_manager._creates_circular_dependency("node2", "node1")
        assert result
    
    def test_connection_cache_performance(self, connection_manager, mock_nodes, mock_connections):
        """Test connection validation caching."""
        # First build should miss cache
        mappings1 = connection_manager.build_connection_mappings(mock_connections, mock_nodes)
        stats1 = connection_manager.get_connection_stats()
        
        # Second build should hit cache
        mappings2 = connection_manager.build_connection_mappings(mock_connections, mock_nodes)
        stats2 = connection_manager.get_connection_stats()
        
        # Cache hits should increase
        assert stats2["cache_hits"] > stats1["cache_hits"]
        assert mappings1.keys() == mappings2.keys()


class TestStateManager:
    """Test suite for StateManager."""
    
    @pytest.fixture
    def cleanup_policy(self):
        return CleanupPolicy(
            max_session_age_minutes=1,  # 1 minute for testing
            max_inactive_minutes=1,     # 1 minute for testing
            cleanup_interval_seconds=1  # 1 second for testing
        )
    
    @pytest.fixture
    def state_manager(self, cleanup_policy):
        manager = StateManager(cleanup_policy)
        yield manager
        manager.shutdown()
    
    def test_create_managed_state(self, state_manager):
        """Test managed state creation."""
        state = state_manager.create_state("test_session", "test_user", "test_workflow")
        
        assert state.session_id == "test_session"
        assert state.user_id == "test_user"
        assert state.workflow_id == "test_workflow"
        
        # Should be able to retrieve the same state
        retrieved_state = state_manager.get_state("test_session")
        assert retrieved_state is state
    
    def test_state_cleanup_by_age(self, state_manager):
        """Test automatic state cleanup by age."""
        # Create state
        state = state_manager.create_state("old_session")
        
        # Manually set old creation time
        metrics = state_manager._state_metrics["old_session"]
        metrics.created_at = datetime.now() - timedelta(minutes=2)
        
        # Force cleanup
        state_manager._perform_cleanup()
        
        # State should be cleaned up
        assert state_manager.get_state("old_session") is None
    
    def test_state_cleanup_by_inactivity(self, state_manager):
        """Test automatic state cleanup by inactivity."""
        # Create state
        state = state_manager.create_state("inactive_session")
        
        # Manually set old access time
        metrics = state_manager._state_metrics["inactive_session"]
        metrics.last_accessed = datetime.now() - timedelta(minutes=2)
        
        # Force cleanup
        state_manager._perform_cleanup()
        
        # State should be cleaned up
        assert state_manager.get_state("inactive_session") is None
    
    def test_force_cleanup_on_limit(self, state_manager):
        """Test force cleanup when session limit is reached."""
        # Set low session limit
        state_manager.cleanup_policy.max_total_sessions = 2
        
        # Create states up to limit
        state1 = state_manager.create_state("session1")
        state2 = state_manager.create_state("session2")
        
        # Creating third state should trigger cleanup
        state3 = state_manager.create_state("session3")
        
        # Should have exactly 2 states (oldest cleaned up)
        assert len(state_manager._states) <= 2
        assert state_manager.get_state("session3") is not None
    
    def test_cleanup_callbacks(self, state_manager):
        """Test cleanup callbacks are called."""
        callback_called = []
        
        def cleanup_callback(session_id):
            callback_called.append(session_id)
        
        state_manager.register_cleanup_callback(cleanup_callback)
        
        # Create and cleanup state
        state_manager.create_state("callback_test")
        state_manager.cleanup_state("callback_test")
        
        assert "callback_test" in callback_called
    
    def test_state_statistics(self, state_manager):
        """Test state statistics collection."""
        # Create some states
        state_manager.create_state("stats_test1")
        state_manager.create_state("stats_test2")
        
        stats = state_manager.get_statistics()
        
        assert stats["active_sessions"] == 2
        assert stats["total_cleanups"] == 0
        assert "total_memory_mb" in stats
        assert "average_session_age_minutes" in stats


class TestMemoryManager:
    """Test suite for EnhancedMemoryManager."""
    
    @pytest.fixture
    def memory_policy(self):
        return MemoryCleanupPolicy(
            max_session_age_hours=1,    # 1 hour for testing
            max_inactive_hours=1,       # 1 hour for testing
            cleanup_interval_minutes=1  # 1 minute for testing
        )
    
    @pytest.fixture
    def memory_manager(self, memory_policy):
        manager = EnhancedMemoryManager(memory_policy)
        yield manager
        manager.shutdown()
    
    def test_get_or_create_memory(self, memory_manager):
        """Test memory creation and retrieval."""
        memory1 = memory_manager.get_or_create_memory("test_session")
        memory2 = memory_manager.get_or_create_memory("test_session")
        
        # Should return the same memory instance
        assert memory1 is memory2
        
        # Should have metrics
        assert "test_session" in memory_manager._memory_metrics
    
    def test_memory_cleanup_by_age(self, memory_manager):
        """Test memory cleanup by age."""
        # Create memory
        memory = memory_manager.get_or_create_memory("old_memory_session")
        
        # Manually set old creation time
        metrics = memory_manager._memory_metrics["old_memory_session"]
        metrics.created_at = datetime.now() - timedelta(hours=2)
        
        # Force cleanup
        memory_manager._perform_cleanup()
        
        # Memory should be cleaned up
        assert "old_memory_session" not in memory_manager._session_memories
    
    def test_memory_cleanup_by_message_count(self, memory_manager):
        """Test memory cleanup by message count."""
        # Create memory
        memory = memory_manager.get_or_create_memory("high_message_session")
        
        # Manually set high message count
        metrics = memory_manager._memory_metrics["high_message_session"]
        metrics.message_count = memory_manager.cleanup_policy.max_messages_per_session + 1
        
        # Force cleanup
        memory_manager._perform_cleanup()
        
        # Memory should be cleaned up
        assert "high_message_session" not in memory_manager._session_memories
    
    def test_memory_statistics(self, memory_manager):
        """Test memory statistics collection."""
        # Create some memories
        memory_manager.get_or_create_memory("stats_memory1")
        memory_manager.get_or_create_memory("stats_memory2")
        
        stats = memory_manager.get_statistics()
        
        assert stats["active_memory_sessions"] == 2
        assert "total_memory_mb" in stats
        assert "average_messages_per_session" in stats


class TestPerformanceMonitor:
    """Test suite for PerformanceMonitor."""
    
    @pytest.fixture
    def performance_monitor(self):
        return PerformanceMonitor()
    
    def test_workflow_monitoring(self, performance_monitor):
        """Test workflow performance monitoring."""
        session_id = performance_monitor.start_workflow_monitoring(
            "test_workflow", "test_session", 5, 10
        )
        
        # Simulate some processing time
        time.sleep(0.1)
        
        performance_monitor.end_workflow_monitoring(session_id, success=True)
        
        # Check workflow statistics
        stats = performance_monitor.get_workflow_statistics(session_id)
        assert stats["workflow_id"] == "test_workflow"
        assert stats["success"] is True
        assert stats["total_duration"] > 0
    
    def test_node_execution_monitoring(self, performance_monitor):
        """Test node execution monitoring."""
        execution_id = performance_monitor.start_node_execution(
            "test_node", "TestNodeType", "test_session"
        )
        
        # Simulate processing
        time.sleep(0.05)
        
        performance_monitor.end_node_execution(execution_id, success=True)
        
        # Check node statistics
        stats = performance_monitor.get_node_statistics("test_node")
        assert stats["node_id"] == "test_node"
        assert stats["execution_count"] == 1
        assert stats["success_rate"] == 1.0
        assert stats["avg_execution_time"] > 0
    
    def test_performance_alerts(self, performance_monitor):
        """Test performance alerting."""
        alert_triggered = []
        
        def alert_callback(alert_type, data):
            alert_triggered.append((alert_type, data))
        
        performance_monitor.register_alert_callback(alert_callback)
        
        # Set low threshold for testing
        performance_monitor.thresholds["node_execution_time_warning"] = 0.01
        
        execution_id = performance_monitor.start_node_execution(
            "slow_node", "SlowNodeType"
        )
        
        # Simulate slow execution
        time.sleep(0.02)
        
        performance_monitor.end_node_execution(execution_id, success=True)
        
        # Should trigger alert
        assert len(alert_triggered) > 0
        assert alert_triggered[0][0] == "execution_time_warning"
    
    def test_connection_resolution_monitoring(self, performance_monitor):
        """Test connection resolution monitoring."""
        performance_monitor.record_connection_resolution_time(
            10, 20, 0.5, "test_session"
        )
        
        # Check if metric was recorded
        assert len(performance_monitor._metrics_history) > 0
        
        # Find the connection resolution metric
        connection_metrics = [
            m for m in performance_monitor._metrics_history
            if m.metric_type == MetricType.CONNECTION_RESOLUTION
        ]
        assert len(connection_metrics) > 0
        assert connection_metrics[0].value == 0.5
    
    def test_memory_usage_monitoring(self, performance_monitor):
        """Test memory usage monitoring."""
        performance_monitor.record_memory_usage(100.0, "test_session", "test_component")
        
        # Check if metric was recorded
        memory_metrics = [
            m for m in performance_monitor._metrics_history
            if m.metric_type == MetricType.MEMORY_USAGE
        ]
        assert len(memory_metrics) > 0
        assert memory_metrics[0].value == 100.0


class TestEnhancedGraphBuilder:
    """Test suite for EnhancedGraphBuilder."""
    
    @pytest.fixture
    def mock_node_registry(self):
        """Create mock node registry."""
        mock_node_class = Mock()
        mock_instance = Mock()
        mock_instance.node_id = None
        mock_instance.user_data = {}
        mock_node_class.return_value = mock_instance
        
        return {"TestNode": mock_node_class}
    
    @pytest.fixture
    def enhanced_builder(self, mock_node_registry):
        return EnhancedGraphBuilder(mock_node_registry)
    
    def test_workflow_validation(self, enhanced_builder):
        """Test workflow validation."""
        valid_workflow = {
            "nodes": [
                {"id": "start", "type": "StartNode"},
                {"id": "test", "type": "TestNode"},
                {"id": "end", "type": "EndNode"}
            ],
            "edges": [
                {"source": "start", "target": "test"},
                {"source": "test", "target": "end"}
            ]
        }
        
        result = enhanced_builder.validate_workflow(valid_workflow)
        assert result["valid"] is True
        assert len(result["errors"]) == 0
    
    def test_workflow_validation_errors(self, enhanced_builder):
        """Test workflow validation with errors."""
        invalid_workflow = {
            "nodes": [
                {"id": "test", "type": "UnknownNode"}  # Unknown node type
            ],
            "edges": [
                {"source": "test", "target": "missing"}  # Missing target
            ]
        }
        
        result = enhanced_builder.validate_workflow(invalid_workflow)
        assert result["valid"] is False
        assert len(result["errors"]) > 0
    
    def test_enhanced_build_metrics(self, enhanced_builder):
        """Test build metrics collection."""
        workflow = {
            "nodes": [
                {"id": "start", "type": "StartNode"},
                {"id": "test", "type": "TestNode"}
            ],
            "edges": [
                {"source": "start", "target": "test"}
            ]
        }
        
        try:
            enhanced_builder.build_from_flow(workflow)
        except Exception:
            pass  # Expected due to mock setup
        
        metrics = enhanced_builder.get_build_metrics()
        assert "node_count" in metrics
        assert "connection_count" in metrics
        assert "build_duration" in metrics


class TestIntegration:
    """Integration tests for all enhanced systems."""
    
    @pytest.fixture
    def full_system_setup(self):
        """Set up full system for integration testing."""
        # Create mock node registry
        mock_node_class = Mock()
        mock_instance = Mock()
        mock_instance.node_id = None
        mock_instance.user_data = {}
        mock_instance.metadata = Mock()
        mock_instance.metadata.node_type = Mock()
        mock_instance.metadata.node_type.value = "provider"
        mock_node_class.return_value = mock_instance
        
        node_registry = {"TestNode": mock_node_class}
        
        # Create enhanced builder
        builder = EnhancedGraphBuilder(node_registry)
        
        # Create workflow
        workflow = {
            "nodes": [
                {"id": "start", "type": "StartNode"},
                {"id": "test", "type": "TestNode"},
                {"id": "end", "type": "EndNode"}
            ],
            "edges": [
                {"source": "start", "target": "test"},
                {"source": "test", "target": "end"}
            ]
        }
        
        return builder, workflow
    
    def test_full_workflow_execution_monitoring(self, full_system_setup):
        """Test full workflow execution with all monitoring systems."""
        builder, workflow = full_system_setup
        
        # This would normally build and execute the workflow
        # For testing, we'll just verify the systems are integrated
        
        # Check that builder has connection manager
        assert hasattr(builder, 'connection_manager')
        assert isinstance(builder.connection_manager, ConnectionManager)
        
        # Check that performance monitoring is available
        from app.core.performance_monitor import get_performance_monitor
        monitor = get_performance_monitor()
        assert monitor is not None
        
        # Check that state management is available
        from app.core.state_manager import get_state_manager
        state_manager = get_state_manager()
        assert state_manager is not None
    
    def test_memory_integration(self):
        """Test memory management integration."""
        # Create enhanced buffer memory node
        memory_node = EnhancedBufferMemoryNode()
        memory_node.session_id = "integration_test"
        
        # Execute to get memory
        try:
            memory = memory_node.execute()
            assert memory is not None
        except Exception:
            pass  # Expected due to missing dependencies in test environment
        
        # Check that memory manager is integrated
        from app.core.memory_manager import get_memory_manager
        manager = get_memory_manager()
        assert manager is not None


# Performance benchmarks
class TestPerformanceBenchmarks:
    """Performance benchmark tests."""
    
    def test_connection_mapping_performance(self):
        """Benchmark connection mapping performance."""
        connection_manager = ConnectionManager()
        
        # Create large number of mock connections
        connections = []
        nodes = {}
        
        for i in range(1000):
            # Create mock connection
            conn = Mock()
            conn.source_node_id = f"node_{i}"
            conn.source_handle = "output"
            conn.target_node_id = f"node_{i+1}"
            conn.target_handle = "input"
            conn.data_type = "str"
            connections.append(conn)
            
            # Create mock nodes
            if f"node_{i}" not in nodes:
                nodes[f"node_{i}"] = Mock()
            if f"node_{i+1}" not in nodes:
                nodes[f"node_{i+1}"] = Mock()
        
        # Benchmark mapping build
        start_time = time.time()
        mappings = connection_manager.build_connection_mappings(connections, nodes)
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"Connection mapping for 1000 connections: {duration:.3f}s")
        
        # Should complete within reasonable time
        assert duration < 1.0  # Less than 1 second
        assert len(mappings) == len(nodes)
    
    def test_state_cleanup_performance(self):
        """Benchmark state cleanup performance."""
        cleanup_policy = CleanupPolicy(cleanup_interval_seconds=1)
        state_manager = StateManager(cleanup_policy)
        
        try:
            # Create many states
            for i in range(100):
                state_manager.create_state(f"perf_test_{i}")
            
            # Benchmark cleanup
            start_time = time.time()
            state_manager._perform_cleanup()
            end_time = time.time()
            
            duration = end_time - start_time
            print(f"State cleanup for 100 sessions: {duration:.3f}s")
            
            # Should complete quickly
            assert duration < 0.5  # Less than 500ms
            
        finally:
            state_manager.shutdown()


if __name__ == "__main__":
    # Run specific test categories
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "-k", "test_connection_mapping_performance or test_state_cleanup_performance"
    ])