#!/usr/bin/env python3
"""Simple performance check for Sprint 1 checkpointer monitoring.

This script provides basic performance insights for the current MemorySaver
implementation and readiness assessment for Sprint 2 PostgreSQL upgrade.
"""

import time
import json
from datetime import datetime
from typing import Dict, Any

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.graph_builder import GraphBuilder
from app.core.node_registry import node_registry
from app.core.checkpointer import get_postgres_checkpointer
from langgraph.checkpoint.memory import MemorySaver


def test_workflow_execution_performance():
    """Test workflow execution performance with MemorySaver."""
    print("🧪 Testing workflow execution performance...")
    
    # Discover nodes
    if not node_registry.nodes:
        node_registry.discover_nodes()
    
    # Create simple test workflow
    test_workflow = {
        "nodes": [
            {
                "id": "start",
                "type": "TestHello",
                "data": {"message": "Hello World"}
            }
        ],
        "edges": []
    }
    
    builder = GraphBuilder(node_registry.nodes)
    
    # Test build performance
    build_times = []
    for i in range(10):
        start_time = time.time()
        try:
            graph = builder.build_from_flow(test_workflow)
            build_times.append(time.time() - start_time)
        except Exception as e:
            print(f"⚠️  Build failed: {e}")
            break
    
    # Test execution performance
    execution_times = []
    if build_times:
        try:
            graph = builder.build_from_flow(test_workflow)
            for i in range(5):
                start_time = time.time()
                try:
                    result = graph.invoke({"input": "test"})
                    execution_times.append(time.time() - start_time)
                except Exception as e:
                    print(f"⚠️  Execution failed: {e}")
                    break
        except Exception as e:
            print(f"⚠️  Graph build failed: {e}")
    
    return {
        "build_times": build_times,
        "execution_times": execution_times,
        "avg_build_ms": sum(build_times) * 1000 / len(build_times) if build_times else 0,
        "avg_execution_ms": sum(execution_times) * 1000 / len(execution_times) if execution_times else 0
    }


def check_checkpointer_availability():
    """Check availability of different checkpointer implementations."""
    print("🧪 Checking checkpointer availability...")
    
    # Test MemorySaver (always available)
    memory_saver = MemorySaver()
    memory_available = True
    
    # Test PostgreSQL checkpointer
    postgres_checkpointer = None
    postgres_available = False
    postgres_error = None
    
    try:
        postgres_checkpointer = get_postgres_checkpointer()
        postgres_available = postgres_checkpointer.is_available()
        if not postgres_available:
            postgres_error = "Database connection not configured"
    except Exception as e:
        postgres_error = str(e)
    
    return {
        "memory_saver": {
            "available": memory_available,
            "type": "In-memory",
            "persistence": "Session-only",
            "pros": ["Fast", "No setup required"],
            "cons": ["Data lost on restart", "Memory usage grows with sessions"]
        },
        "postgres_checkpointer": {
            "available": postgres_available,
            "type": "PostgreSQL database",
            "persistence": "Persistent",
            "error": postgres_error,
            "pros": ["Persistent", "Survives restarts", "Scalable"],
            "cons": ["Requires database setup", "Network latency"]
        }
    }


def analyze_memory_usage():
    """Analyze memory usage patterns."""
    print("🧪 Analyzing memory usage patterns...")
    
    # Simulate different workflow sizes
    small_workflow = {
        "nodes": [{"id": "n1", "type": "TestHello", "data": {"msg": "small"}}],
        "edges": []
    }
    
    medium_workflow = {
        "nodes": [
            {"id": f"n{i}", "type": "TestHello", "data": {"msg": f"node{i}"}}
            for i in range(5)
        ],
        "edges": [
            {"source": f"n{i}", "target": f"n{i+1}"}
            for i in range(4)
        ]
    }
    
    large_workflow = {
        "nodes": [
            {"id": f"n{i}", "type": "TestHello", "data": {"msg": f"node{i}"}}
            for i in range(20)
        ],
        "edges": [
            {"source": f"n{i}", "target": f"n{i+1}"}
            for i in range(19)
        ]
    }
    
    workflows = {
        "small": small_workflow,
        "medium": medium_workflow,
        "large": large_workflow
    }
    
    results = {}
    for size, workflow in workflows.items():
        workflow_json = json.dumps(workflow)
        results[size] = {
            "nodes_count": len(workflow["nodes"]),
            "edges_count": len(workflow["edges"]),
            "json_size_bytes": len(workflow_json),
            "json_size_kb": len(workflow_json) / 1024
        }
    
    return results


def generate_sprint_2_recommendations():
    """Generate recommendations for Sprint 2 PostgreSQL upgrade."""
    print("🧪 Generating Sprint 2 recommendations...")
    
    checkpointer_status = check_checkpointer_availability()
    performance_data = test_workflow_execution_performance()
    memory_analysis = analyze_memory_usage()
    
    recommendations = []
    
    # PostgreSQL readiness
    if checkpointer_status["postgres_checkpointer"]["available"]:
        recommendations.append(
            "✅ PostgreSQL checkpointer is available and ready for Sprint 2 upgrade"
        )
    else:
        recommendations.append(
            "⚠️  PostgreSQL checkpointer not available. Setup required before Sprint 2:"
        )
        recommendations.append(
            "   - Configure DATABASE_URL environment variable"
        )
        recommendations.append(
            "   - Ensure PostgreSQL server is running"
        )
        recommendations.append(
            "   - Run database migrations"
        )
    
    # Performance recommendations
    if performance_data["avg_build_ms"] > 100:
        recommendations.append(
            f"📊 Workflow build time is {performance_data['avg_build_ms']:.1f}ms. "
            "Consider optimizing node registry lookup."
        )
    
    if performance_data["avg_execution_ms"] > 1000:
        recommendations.append(
            f"📊 Workflow execution time is {performance_data['avg_execution_ms']:.1f}ms. "
            "Monitor for performance regression with PostgreSQL checkpointer."
        )
    
    # Memory usage recommendations
    large_size = memory_analysis["large"]["json_size_kb"]
    if large_size > 100:
        recommendations.append(
            f"💾 Large workflows detected ({large_size:.1f}KB). "
            "Consider implementing workflow optimization strategies."
        )
    
    return {
        "timestamp": datetime.now().isoformat(),
        "checkpointer_status": checkpointer_status,
        "performance_data": performance_data,
        "memory_analysis": memory_analysis,
        "recommendations": recommendations,
        "sprint_2_priority": (
            "HIGH - Setup PostgreSQL first" 
            if not checkpointer_status["postgres_checkpointer"]["available"]
            else "MEDIUM - Ready for upgrade"
        )
    }


def main():
    """Run simplified performance check."""
    print("🚀 Agent-Flow V2 Performance Check (Sprint 1)")
    print("=" * 50)
    
    report = generate_sprint_2_recommendations()
    
    # Display results
    print("\n📊 CHECKPOINTER STATUS")
    print("=" * 30)
    
    for name, status in report["checkpointer_status"].items():
        print(f"🔧 {name.replace('_', ' ').title()}:")
        print(f"   Available: {status['available']}")
        print(f"   Type: {status['type']}")
        print(f"   Persistence: {status['persistence']}")
        if status.get('error'):
            print(f"   Error: {status['error']}")
        print()
    
    print("⚡ PERFORMANCE METRICS")
    print("=" * 30)
    perf = report["performance_data"]
    print(f"Build Time: {perf['avg_build_ms']:.1f}ms avg")
    print(f"Execution Time: {perf['avg_execution_ms']:.1f}ms avg")
    print()
    
    print("💾 MEMORY ANALYSIS")
    print("=" * 30)
    for size, data in report["memory_analysis"].items():
        print(f"{size.title()}: {data['nodes_count']} nodes, {data['json_size_kb']:.1f}KB")
    print()
    
    print("💡 RECOMMENDATIONS")
    print("=" * 30)
    for rec in report["recommendations"]:
        print(f"   {rec}")
    print()
    
    print("🎯 SPRINT 2 PRIORITY")
    print("=" * 30)
    print(f"   {report['sprint_2_priority']}")
    print()
    
    # Save report
    with open("sprint1_performance_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    print("📄 Report saved to: sprint1_performance_report.json")


if __name__ == "__main__":
    main() 