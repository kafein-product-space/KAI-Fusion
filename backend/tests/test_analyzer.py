#!/usr/bin/env python3
"""
KAI-Fusion Test Result Analysis System - Advanced Test Analytics & Reporting
===========================================================================

Bu modül comprehensive test result analysis, performance tracking, ve 
detailed reporting capabilities sağlar. Test sonuçlarını analiz eder,
performans metriklerini takip eder, ve optimization önerileri sunar.

Kullanım:
    python test_analyzer.py --analyze-all
    python test_analyzer.py --performance-report
    python test_analyzer.py --node-performance
    python test_analyzer.py --compare-results file1.json file2.json
    python test_analyzer.py --trends --days 7
"""

import argparse
import json
import os
import statistics
import time
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
try:
    import matplotlib.pyplot as plt
    import pandas as pd
    PLOTTING_AVAILABLE = True
except ImportError:
    PLOTTING_AVAILABLE = False


class TestResultAnalyzer:
    """Comprehensive test result analysis system."""
    
    def __init__(self, results_dir: str = None):
        self.results_dir = Path(results_dir or (Path(__file__).parent / "test_results"))
        self.results_dir.mkdir(exist_ok=True)
        
        print(f"🔍 Test Result Analyzer initialized")
        print(f"📁 Results directory: {self.results_dir}")
        
    def load_all_results(self) -> List[Dict[str, Any]]:
        """Tüm test sonuçlarını yükle."""
        results = []
        
        for file_path in self.results_dir.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    result = json.load(f)
                    result['_file'] = file_path.name
                    results.append(result)
            except Exception as e:
                print(f"⚠️ Error loading {file_path}: {e}")
        
        print(f"📊 Loaded {len(results)} test results")
        return results
    
    def analyze_success_rates(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Success/failure rates analizi."""
        total = len(results)
        if total == 0:
            return {"total": 0, "success_rate": 0, "failure_rate": 0}
        
        successful = sum(1 for r in results if r.get("success", False))
        failed = total - successful
        
        success_rate = (successful / total) * 100
        failure_rate = (failed / total) * 100
        
        # Kategorilere göre success rates
        workflow_success = defaultdict(list)
        for result in results:
            workflow_name = result.get("workflow", {}).get("name", "Unknown")
            workflow_success[workflow_name].append(result.get("success", False))
        
        workflow_rates = {}
        for workflow, successes in workflow_success.items():
            total_tests = len(successes)
            successful_tests = sum(successes)
            workflow_rates[workflow] = {
                "total": total_tests,
                "successful": successful_tests,
                "success_rate": (successful_tests / total_tests) * 100 if total_tests > 0 else 0
            }
        
        return {
            "total": total,
            "successful": successful,
            "failed": failed,
            "success_rate": success_rate,
            "failure_rate": failure_rate,
            "workflow_rates": workflow_rates
        }
    
    def analyze_performance(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Performance metrics analizi."""
        execution_times = [r.get("execution_time", 0) for r in results if r.get("execution_time")]
        
        if not execution_times:
            return {"no_data": True}
        
        performance_stats = {
            "total_tests": len(execution_times),
            "avg_execution_time": statistics.mean(execution_times),
            "median_execution_time": statistics.median(execution_times),
            "min_execution_time": min(execution_times),
            "max_execution_time": max(execution_times),
            "std_deviation": statistics.stdev(execution_times) if len(execution_times) > 1 else 0
        }
        
        # Performance by workflow type
        workflow_performance = defaultdict(list)
        for result in results:
            if result.get("execution_time"):
                workflow_name = result.get("workflow", {}).get("name", "Unknown")
                workflow_performance[workflow_name].append(result["execution_time"])
        
        workflow_stats = {}
        for workflow, times in workflow_performance.items():
            if times:
                workflow_stats[workflow] = {
                    "count": len(times),
                    "avg_time": statistics.mean(times),
                    "min_time": min(times),
                    "max_time": max(times),
                    "median_time": statistics.median(times)
                }
        
        performance_stats["workflow_performance"] = workflow_stats
        
        # Performance kategorileri
        slow_threshold = performance_stats["avg_execution_time"] * 1.5
        fast_tests = [t for t in execution_times if t < performance_stats["avg_execution_time"]]
        slow_tests = [t for t in execution_times if t > slow_threshold]
        
        performance_stats["performance_categories"] = {
            "fast_tests": len(fast_tests),
            "normal_tests": len(execution_times) - len(fast_tests) - len(slow_tests),
            "slow_tests": len(slow_tests),
            "slow_threshold": slow_threshold
        }
        
        return performance_stats
    
    def analyze_node_usage(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Node usage patterns analizi."""
        node_usage = Counter()
        node_performance = defaultdict(list)
        node_success_rates = defaultdict(list)
        
        for result in results:
            workflow = result.get("workflow", {})
            nodes = workflow.get("nodes", [])
            execution_time = result.get("execution_time", 0)
            success = result.get("success", False)
            
            for node in nodes:
                node_type = node.get("type", "Unknown")
                node_usage[node_type] += 1
                
                if execution_time:
                    # Node başına ortalama execution time (yaklaşık)
                    avg_node_time = execution_time / len(nodes) if nodes else execution_time
                    node_performance[node_type].append(avg_node_time)
                
                node_success_rates[node_type].append(success)
        
        # Node performance stats
        node_stats = {}
        for node_type in node_usage.keys():
            times = node_performance.get(node_type, [])
            successes = node_success_rates.get(node_type, [])
            
            node_stats[node_type] = {
                "usage_count": node_usage[node_type],
                "avg_execution_time": statistics.mean(times) if times else 0,
                "success_rate": (sum(successes) / len(successes)) * 100 if successes else 0,
                "total_appearances": len(successes)
            }
        
        # En çok kullanılan node'lar
        most_used = node_usage.most_common(10)
        
        # En yavaş node'lar
        slowest_nodes = sorted(
            [(node, stats["avg_execution_time"]) for node, stats in node_stats.items()],
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            "node_usage_counts": dict(node_usage),
            "node_performance_stats": node_stats,
            "most_used_nodes": most_used,
            "slowest_nodes": slowest_nodes
        }
    
    def analyze_error_patterns(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Error pattern analizi."""
        errors = []
        error_types = Counter()
        error_by_workflow = defaultdict(list)
        
        for result in results:
            if not result.get("success", True) and result.get("error"):
                error = result["error"]
                errors.append({
                    "error": error,
                    "workflow": result.get("workflow", {}).get("name", "Unknown"),
                    "timestamp": result.get("timestamp"),
                    "file": result.get("_file")
                })
                
                # Error type classification
                error_lower = str(error).lower()
                if "timeout" in error_lower:
                    error_type = "Timeout"
                elif "connection" in error_lower or "network" in error_lower:
                    error_type = "Network"
                elif "validation" in error_lower:
                    error_type = "Validation"
                elif "authentication" in error_lower or "auth" in error_lower:
                    error_type = "Authentication"
                elif "import" in error_lower or "module" in error_lower:
                    error_type = "Import/Module"
                else:
                    error_type = "Other"
                
                error_types[error_type] += 1
                error_by_workflow[result.get("workflow", {}).get("name", "Unknown")].append(error)
        
        # En sık görülen error'lar
        common_errors = Counter([e["error"] for e in errors]).most_common(10)
        
        return {
            "total_errors": len(errors),
            "error_types": dict(error_types),
            "common_errors": common_errors,
            "errors_by_workflow": dict(error_by_workflow),
            "recent_errors": sorted(errors, key=lambda x: x.get("timestamp", ""), reverse=True)[:10]
        }
    
    def analyze_trends(self, results: List[Dict[str, Any]], days: int = 7) -> Dict[str, Any]:
        """Zaman bazlı trend analizi."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Tarihe göre results'ları grupla
        daily_stats = defaultdict(lambda: {"total": 0, "successful": 0, "total_time": 0})
        
        for result in results:
            timestamp_str = result.get("timestamp", "")
            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                if timestamp >= cutoff_date:
                    date_key = timestamp.date().isoformat()
                    daily_stats[date_key]["total"] += 1
                    if result.get("success", False):
                        daily_stats[date_key]["successful"] += 1
                    if result.get("execution_time"):
                        daily_stats[date_key]["total_time"] += result["execution_time"]
            except (ValueError, TypeError):
                continue
        
        # Günlük istatistikleri hesapla
        trend_data = {}
        for date, stats in daily_stats.items():
            success_rate = (stats["successful"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            avg_time = stats["total_time"] / stats["total"] if stats["total"] > 0 else 0
            
            trend_data[date] = {
                "total_tests": stats["total"],
                "successful_tests": stats["successful"],
                "success_rate": success_rate,
                "avg_execution_time": avg_time
            }
        
        # Trend direction analizi
        sorted_dates = sorted(trend_data.keys())
        if len(sorted_dates) >= 2:
            recent_success_rates = [trend_data[date]["success_rate"] for date in sorted_dates[-3:]]
            early_success_rates = [trend_data[date]["success_rate"] for date in sorted_dates[:3]]
            
            recent_avg = statistics.mean(recent_success_rates) if recent_success_rates else 0
            early_avg = statistics.mean(early_success_rates) if early_success_rates else 0
            
            trend_direction = "improving" if recent_avg > early_avg else "declining" if recent_avg < early_avg else "stable"
        else:
            trend_direction = "insufficient_data"
        
        return {
            "period_days": days,
            "daily_stats": trend_data,
            "trend_direction": trend_direction,
            "total_period_tests": sum(stats["total_tests"] for stats in trend_data.values())
        }
    
    def generate_comprehensive_report(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Comprehensive analiz raporu generate et."""
        print("📊 Generating comprehensive analysis report...")
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "total_results_analyzed": len(results),
            "success_analysis": self.analyze_success_rates(results),
            "performance_analysis": self.analyze_performance(results),
            "node_analysis": self.analyze_node_usage(results),
            "error_analysis": self.analyze_error_patterns(results),
            "trend_analysis": self.analyze_trends(results, days=7),
            "recommendations": self.generate_recommendations(results)
        }
        
        return report
    
    def generate_recommendations(self, results: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Test sonuçlarına göre optimization recommendations generate et."""
        recommendations = []
        
        # Success rate analizi
        success_analysis = self.analyze_success_rates(results)
        if success_analysis["success_rate"] < 80:
            recommendations.append({
                "type": "reliability",
                "priority": "high",
                "message": f"Success rate is low ({success_analysis['success_rate']:.1f}%). Review error patterns and improve workflow reliability."
            })
        
        # Performance analizi
        performance_analysis = self.analyze_performance(results)
        if not performance_analysis.get("no_data"):
            avg_time = performance_analysis["avg_execution_time"]
            if avg_time > 10:  # 10 saniyeden fazla
                recommendations.append({
                    "type": "performance",
                    "priority": "medium",
                    "message": f"Average execution time is high ({avg_time:.2f}s). Consider optimizing slow workflows."
                })
            
            # Yavaş workflow'ları identifiy et
            slow_workflows = []
            for workflow, stats in performance_analysis.get("workflow_performance", {}).items():
                if stats["avg_time"] > avg_time * 1.5:
                    slow_workflows.append(workflow)
            
            if slow_workflows:
                recommendations.append({
                    "type": "performance",
                    "priority": "medium",
                    "message": f"Slow workflows identified: {', '.join(slow_workflows)}. Review and optimize these workflows."
                })
        
        # Node usage analizi
        node_analysis = self.analyze_node_usage(results)
        slow_nodes = [node for node, time in node_analysis["slowest_nodes"][:3] if time > 5]
        if slow_nodes:
            recommendations.append({
                "type": "optimization",
                "priority": "medium",
                "message": f"Slow node types detected: {', '.join(slow_nodes)}. Consider optimizing these node implementations."
            })
        
        # Error pattern analizi
        error_analysis = self.analyze_error_patterns(results)
        if error_analysis["total_errors"] > len(results) * 0.2:  # %20'den fazla error
            most_common_error_type = max(error_analysis["error_types"].items(), key=lambda x: x[1])[0] if error_analysis["error_types"] else "Unknown"
            recommendations.append({
                "type": "reliability",
                "priority": "high",
                "message": f"High error rate detected. Most common error type: {most_common_error_type}. Review error handling and input validation."
            })
        
        return recommendations
    
    def save_analysis_report(self, report: Dict[str, Any], filename: str = None):
        """Analysis raporunu kaydet."""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"analysis_report_{timestamp}.json"
        
        report_file = self.results_dir / filename
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"📄 Analysis report saved: {report_file}")
        return report_file
    
    def print_summary_report(self, report: Dict[str, Any]):
        """Özet raporu konsola yazdır."""
        print("\n" + "="*60)
        print("📊 KAI-FUSION TEST ANALYSIS SUMMARY")
        print("="*60)
        
        print(f"\n📈 Overall Statistics:")
        print(f"  • Total tests analyzed: {report['total_results_analyzed']}")
        
        success = report["success_analysis"]
        print(f"  • Success rate: {success['success_rate']:.1f}% ({success['successful']}/{success['total']})")
        print(f"  • Failure rate: {success['failure_rate']:.1f}%")
        
        perf = report["performance_analysis"]
        if not perf.get("no_data"):
            print(f"\n⏱️ Performance Metrics:")
            print(f"  • Average execution time: {perf['avg_execution_time']:.2f}s")
            print(f"  • Fastest test: {perf['min_execution_time']:.2f}s")
            print(f"  • Slowest test: {perf['max_execution_time']:.2f}s")
            print(f"  • Performance variance: {perf['std_deviation']:.2f}s")
        
        node = report["node_analysis"]
        print(f"\n🧩 Node Usage:")
        print(f"  • Most used nodes: {', '.join([f'{name}({count})' for name, count in node['most_used_nodes'][:3]])}")
        if node["slowest_nodes"]:
            print(f"  • Slowest nodes: {', '.join([f'{name}({time:.2f}s)' for name, time in node['slowest_nodes'][:3]])}")
        
        error = report["error_analysis"]
        if error["total_errors"] > 0:
            print(f"\n❌ Error Analysis:")
            print(f"  • Total errors: {error['total_errors']}")
            print(f"  • Error types: {', '.join([f'{type_}({count})' for type_, count in error['error_types'].items()])}")
        
        trend = report["trend_analysis"]
        print(f"\n📈 Trends (Last {trend['period_days']} days):")
        print(f"  • Total tests: {trend['total_period_tests']}")
        print(f"  • Trend direction: {trend['trend_direction']}")
        
        recommendations = report["recommendations"]
        if recommendations:
            print(f"\n💡 Recommendations:")
            for rec in recommendations:
                priority_emoji = "🔴" if rec["priority"] == "high" else "🟡" if rec["priority"] == "medium" else "🟢"
                print(f"  {priority_emoji} {rec['message']}")
        
        print("\n" + "="*60)
    
    def compare_results(self, file1: str, file2: str) -> Dict[str, Any]:
        """İki test sonucu dosyasını karşılaştır."""
        with open(file1, 'r') as f:
            result1 = json.load(f)
        with open(file2, 'r') as f:
            result2 = json.load(f)
        
        comparison = {
            "file1": file1,
            "file2": file2,
            "execution_time_diff": result2.get("execution_time", 0) - result1.get("execution_time", 0),
            "success_comparison": {
                "file1_success": result1.get("success", False),
                "file2_success": result2.get("success", False),
                "both_successful": result1.get("success", False) and result2.get("success", False)
            },
            "workflow_comparison": {
                "same_workflow": result1.get("workflow", {}).get("name") == result2.get("workflow", {}).get("name"),
                "workflow1": result1.get("workflow", {}).get("name", "Unknown"),
                "workflow2": result2.get("workflow", {}).get("name", "Unknown")
            }
        }
        
        return comparison


def main():
    """Ana fonksiyon."""
    parser = argparse.ArgumentParser(description="KAI-Fusion Test Result Analyzer")
    parser.add_argument("--analyze-all", action="store_true", help="Analyze all test results")
    parser.add_argument("--performance-report", action="store_true", help="Generate performance report")
    parser.add_argument("--node-performance", action="store_true", help="Analyze node performance")
    parser.add_argument("--error-analysis", action="store_true", help="Analyze error patterns")
    parser.add_argument("--trends", action="store_true", help="Show trends analysis")
    parser.add_argument("--days", type=int, default=7, help="Days for trend analysis")
    parser.add_argument("--compare-results", nargs=2, help="Compare two result files")
    parser.add_argument("--save-report", help="Save report to file")
    parser.add_argument("--results-dir", help="Test results directory")
    
    args = parser.parse_args()
    
    analyzer = TestResultAnalyzer(args.results_dir)
    
    if args.compare_results:
        comparison = analyzer.compare_results(args.compare_results[0], args.compare_results[1])
        print("🔄 Comparison Results:")
        print(json.dumps(comparison, indent=2))
        return
    
    # Load all results
    results = analyzer.load_all_results()
    if not results:
        print("❌ No test results found to analyze")
        return
    
    if args.analyze_all:
        report = analyzer.generate_comprehensive_report(results)
        analyzer.print_summary_report(report)
        
        if args.save_report:
            analyzer.save_analysis_report(report, args.save_report)
    
    elif args.performance_report:
        performance = analyzer.analyze_performance(results)
        print("⏱️ Performance Analysis:")
        print(json.dumps(performance, indent=2, default=str))
    
    elif args.node_performance:
        node_analysis = analyzer.analyze_node_usage(results)
        print("🧩 Node Performance Analysis:")
        print(json.dumps(node_analysis, indent=2, default=str))
    
    elif args.error_analysis:
        error_analysis = analyzer.analyze_error_patterns(results)
        print("❌ Error Pattern Analysis:")
        print(json.dumps(error_analysis, indent=2, default=str))
    
    elif args.trends:
        trends = analyzer.analyze_trends(results, args.days)
        print(f"📈 Trend Analysis (Last {args.days} days):")
        print(json.dumps(trends, indent=2, default=str))
    
    else:
        # Default: quick summary
        success_analysis = analyzer.analyze_success_rates(results)
        print(f"📊 Quick Summary ({len(results)} tests):")
        print(f"  Success Rate: {success_analysis['success_rate']:.1f}%")
        
        performance = analyzer.analyze_performance(results)
        if not performance.get("no_data"):
            print(f"  Avg Execution Time: {performance['avg_execution_time']:.2f}s")


if __name__ == "__main__":
    main()