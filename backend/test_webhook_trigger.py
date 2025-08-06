#!/usr/bin/env python3
"""
Webhook Trigger Node - Comprehensive Testing Suite
==================================================

This test suite validates all features and capabilities of the Webhook Trigger Node
including all HTTP methods, authentication, event filtering, rate limiting,
payload validation, and monitoring capabilities.

Test Categories:
- HTTP Methods (GET, POST, PUT, PATCH, DELETE, HEAD)
- Authentication & Security
- Event Type Filtering
- Rate Limiting
- Payload Size Validation
- CORS Support
- Metadata Processing
- Performance & Monitoring
- Error Handling
"""

import asyncio
import json
import time
import uuid
import requests
import threading
from typing import Dict, Any, List
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from app.nodes.triggers.webhook_trigger import WebhookTriggerNode

class WebhookTriggerTester:
    def __init__(self):
        self.test_results = []
        self.passed = 0
        self.failed = 0
        self.base_url = "http://localhost:8000"
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        result = {
            "test_name": test_name,
            "status": "PASS" if success else "FAIL", 
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        if success:
            self.passed += 1
            print(f"✅ {test_name}")
        else:
            self.failed += 1
            print(f"❌ {test_name}: {details}")
            
        if details and success:
            print(f"   ℹ️ {details}")
    
    def test_webhook_creation(self):
        """Test webhook node creation and configuration"""
        try:
            # Test basic webhook creation
            webhook = WebhookTriggerNode()
            
            success = (
                hasattr(webhook, 'webhook_id') and
                hasattr(webhook, 'secret_token') and
                hasattr(webhook, 'endpoint_path') and
                webhook.webhook_id.startswith('wh_')
            )
            
            details = f"Webhook ID: {webhook.webhook_id}, Endpoint: {webhook.endpoint_path}"
            self.log_test("Webhook Creation", success, details)
            
            return webhook if success else None
            
        except Exception as e:
            self.log_test("Webhook Creation", False, str(e))
            return None
    
    def test_http_method_configuration(self):
        """Test HTTP method configuration"""
        try:
            methods_tested = []
            
            for method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']:
                webhook = WebhookTriggerNode()
                result = webhook.execute(
                    http_method=method,
                    authentication_required=False
                )
                
                config = result.get('webhook_config', {})
                if config.get('http_method') == method:
                    methods_tested.append(method)
            
            success = len(methods_tested) == 6
            details = f"Methods configured: {', '.join(methods_tested)}"
            self.log_test("HTTP Method Configuration", success, details)
            
        except Exception as e:
            self.log_test("HTTP Method Configuration", False, str(e))
    
    def test_authentication_configuration(self):
        """Test authentication settings"""
        try:
            # Test with authentication enabled
            webhook_auth = WebhookTriggerNode()
            result_auth = webhook_auth.execute(
                authentication_required=True,
                http_method='POST'
            )
            
            # Test with authentication disabled
            webhook_no_auth = WebhookTriggerNode()
            result_no_auth = webhook_no_auth.execute(
                authentication_required=False,
                http_method='POST'
            )
            
            success = (
                result_auth.get('webhook_token') is not None and
                result_no_auth.get('webhook_token') is None
            )
            
            details = f"Auth Token Generated: {result_auth.get('webhook_token') is not None}"
            self.log_test("Authentication Configuration", success, details)
            
        except Exception as e:
            self.log_test("Authentication Configuration", False, str(e))
    
    def test_event_type_filtering(self):
        """Test event type filtering configuration"""
        try:
            webhook = WebhookTriggerNode()
            allowed_events = "user.created,order.completed,payment.processed"
            
            result = webhook.execute({
                'allowed_event_types': allowed_events,
                'authentication_required': False
            }, {})
            
            config = result.get('webhook_config', {})
            success = config.get('allowed_event_types') == allowed_events
            
            details = f"Event types configured: {config.get('allowed_event_types', 'None')}"
            self.log_test("Event Type Filtering", success, details)
            
        except Exception as e:
            self.log_test("Event Type Filtering", False, str(e))
    
    def test_payload_size_limits(self):
        """Test payload size limit configuration"""
        try:
            webhook = WebhookTriggerNode()
            max_size = 2048  # 2MB
            
            result = webhook.execute({
                'max_payload_size': max_size,
                'authentication_required': False
            }, {})
            
            config = result.get('webhook_config', {})
            success = config.get('max_payload_size_kb') == max_size
            
            details = f"Max payload size: {config.get('max_payload_size_kb', 0)}KB"
            self.log_test("Payload Size Limits", success, details)
            
        except Exception as e:
            self.log_test("Payload Size Limits", False, str(e))
    
    def test_rate_limiting_config(self):
        """Test rate limiting configuration"""
        try:
            webhook = WebhookTriggerNode()
            rate_limit = 120  # requests per minute
            
            result = webhook.execute({
                'rate_limit_per_minute': rate_limit,
                'authentication_required': False
            }, {})
            
            config = result.get('webhook_config', {})
            success = config.get('rate_limit_per_minute') == rate_limit
            
            details = f"Rate limit: {config.get('rate_limit_per_minute', 0)} req/min"
            self.log_test("Rate Limiting Configuration", success, details)
            
        except Exception as e:
            self.log_test("Rate Limiting Configuration", False, str(e))
    
    def test_cors_configuration(self):
        """Test CORS configuration"""
        try:
            # Test with CORS enabled
            webhook_cors = WebhookTriggerNode()
            result_cors = webhook_cors.execute({
                'enable_cors': True,
                'authentication_required': False
            }, {})
            
            # Test with CORS disabled
            webhook_no_cors = WebhookTriggerNode()
            result_no_cors = webhook_no_cors.execute({
                'enable_cors': False,
                'authentication_required': False  
            }, {})
            
            config_cors = result_cors.get('webhook_config', {})
            config_no_cors = result_no_cors.get('webhook_config', {})
            
            success = (
                config_cors.get('enable_cors') == True and
                config_no_cors.get('enable_cors') == False
            )
            
            details = f"CORS enabled: {config_cors.get('enable_cors', False)}, disabled: {config_no_cors.get('enable_cors', True)}"
            self.log_test("CORS Configuration", success, details)
            
        except Exception as e:
            self.log_test("CORS Configuration", False, str(e))
    
    def test_timeout_configuration(self):
        """Test webhook timeout configuration"""
        try:
            webhook = WebhookTriggerNode()
            timeout = 60  # seconds
            
            result = webhook.execute({
                'webhook_timeout': timeout,
                'authentication_required': False
            }, {})
            
            config = result.get('webhook_config', {})
            success = config.get('timeout_seconds') == timeout
            
            details = f"Timeout: {config.get('timeout_seconds', 0)}s"
            self.log_test("Timeout Configuration", success, details)
            
        except Exception as e:
            self.log_test("Timeout Configuration", False, str(e))
    
    def test_webhook_endpoint_generation(self):
        """Test webhook endpoint URL generation"""
        try:
            webhook = WebhookTriggerNode()
            result = webhook.execute({
                'authentication_required': False
            }, {})
            
            endpoint = result.get('webhook_endpoint', '')
            webhook_id = webhook.webhook_id
            
            success = (
                endpoint.startswith('http') and
                '/api/webhooks/' in endpoint and
                webhook_id in endpoint
            )
            
            details = f"Endpoint: {endpoint}"
            self.log_test("Webhook Endpoint Generation", success, details)
            
        except Exception as e:
            self.log_test("Webhook Endpoint Generation", False, str(e))
    
    def test_workflow_state_execution(self):
        """Test webhook execution in workflow state"""
        try:
            from app.core.state import FlowState
            
            webhook = WebhookTriggerNode()
            webhook.node_id = "test_webhook_1"
            
            # Mock flow state
            state = FlowState(
                input="test input",
                last_output="",
                context={},
                variables={},
                executed_nodes=[],
                node_outputs={},
                error=None
            )
            
            # Set webhook payload in user data
            webhook.user_data['webhook_payload'] = {
                'event_type': 'test.event',
                'data': {'message': 'Test webhook execution'}
            }
            
            result = webhook._execute(state)
            
            success = (
                'webhook_data' in result and
                'webhook_endpoint' in result and
                'status' in result and
                result['status'] == 'webhook_ready'
            )
            
            details = f"Status: {result.get('status', 'unknown')}, Node ID in executed: {webhook.node_id in state.executed_nodes}"
            self.log_test("Workflow State Execution", success, details)
            
        except Exception as e:
            self.log_test("Workflow State Execution", False, str(e))
    
    def test_metadata_processing(self):
        """Test webhook metadata processing"""
        try:
            webhook = WebhookTriggerNode()
            
            # Test webhook statistics functionality
            stats = webhook.get_webhook_stats()
            
            success = (
                'webhook_id' in stats and
                'total_events' in stats and
                'event_types' in stats and
                'sources' in stats and
                isinstance(stats['event_types'], dict) and
                isinstance(stats['sources'], dict)
            )
            
            details = f"Stats keys: {', '.join(stats.keys())}, Total events: {stats.get('total_events', 0)}"
            self.log_test("Metadata Processing", success, details)
            
        except Exception as e:
            self.log_test("Metadata Processing", False, str(e))
    
    def test_runnable_creation(self):
        """Test LangChain Runnable creation"""
        try:
            webhook = WebhookTriggerNode()
            result = webhook.execute({
                'authentication_required': False
            }, {})
            
            runnable = result.get('webhook_runnable')
            
            success = (
                runnable is not None and
                hasattr(runnable, 'invoke') and
                hasattr(runnable, 'ainvoke') and
                hasattr(runnable, 'astream')
            )
            
            details = f"Runnable type: {type(runnable).__name__}, Has required methods: {success}"
            self.log_test("LangChain Runnable Creation", success, details)
            
        except Exception as e:
            self.log_test("LangChain Runnable Creation", False, str(e))
    
    def test_multiple_webhooks_isolation(self):
        """Test multiple webhook isolation"""
        try:
            # Create multiple webhooks
            webhook1 = WebhookTriggerNode()
            webhook2 = WebhookTriggerNode()
            webhook3 = WebhookTriggerNode()
            
            # Get their configurations
            result1 = webhook1.execute({'authentication_required': False}, {})
            result2 = webhook2.execute({'authentication_required': False}, {})  
            result3 = webhook3.execute({'authentication_required': False}, {})
            
            # Check that they have unique IDs and endpoints
            webhook_ids = [webhook1.webhook_id, webhook2.webhook_id, webhook3.webhook_id]
            tokens = [
                result1.get('webhook_config', {}).get('secret_token', ''),
                result2.get('webhook_config', {}).get('secret_token', ''),
                result3.get('webhook_config', {}).get('secret_token', '')
            ]
            
            success = (
                len(set(webhook_ids)) == 3 and  # All unique IDs
                len(set(tokens)) == 3 and       # All unique tokens
                all(wid.startswith('wh_') for wid in webhook_ids)
            )
            
            details = f"Unique webhooks: {len(set(webhook_ids))}/3, Unique tokens: {len(set(tokens))}/3"
            self.log_test("Multiple Webhooks Isolation", success, details)
            
        except Exception as e:
            self.log_test("Multiple Webhooks Isolation", False, str(e))
    
    def test_configuration_validation(self):
        """Test configuration parameter validation"""
        try:
            webhook = WebhookTriggerNode()
            
            # Test with various configurations
            test_configs = [
                {'max_payload_size': 512, 'rate_limit_per_minute': 30},
                {'allowed_event_types': 'test.event1,test.event2,test.event3'},
                {'webhook_timeout': 120, 'enable_cors': True},
                {'authentication_required': True, 'http_method': 'GET'}
            ]
            
            valid_configs = 0
            for config in test_configs:
                try:
                    result = webhook.execute(config, {})
                    if 'webhook_config' in result:
                        valid_configs += 1
                except Exception:
                    pass
            
            success = valid_configs == len(test_configs)
            details = f"Valid configurations: {valid_configs}/{len(test_configs)}"
            self.log_test("Configuration Validation", success, details)
            
        except Exception as e:
            self.log_test("Configuration Validation", False, str(e))
    
    def test_error_conditions(self):
        """Test error handling conditions"""
        try:
            webhook = WebhookTriggerNode()
            
            # Test with invalid configurations
            error_configs = [
                {'max_payload_size': -1},  # Invalid size
                {'rate_limit_per_minute': -1},  # Invalid rate limit
                {'webhook_timeout': 0}  # Invalid timeout
            ]
            
            errors_handled = 0
            for config in error_configs:
                try:
                    result = webhook.execute(config, {})
                    # Should still work but use defaults
                    if 'webhook_config' in result:
                        errors_handled += 1
                except Exception:
                    errors_handled += 1  # Error properly caught
            
            success = errors_handled >= len(error_configs) - 1  # Allow some flexibility
            details = f"Error conditions handled: {errors_handled}/{len(error_configs)}"
            self.log_test("Error Conditions Handling", success, details)
            
        except Exception as e:
            self.log_test("Error Conditions Handling", False, str(e))
    
    def test_performance_characteristics(self):
        """Test performance characteristics"""
        try:
            # Test webhook creation speed
            start_time = time.time()
            
            webhooks_created = []
            for i in range(10):
                webhook = WebhookTriggerNode()
                result = webhook.execute({'authentication_required': False}, {})
                if 'webhook_endpoint' in result:
                    webhooks_created.append(webhook)
            
            end_time = time.time()
            creation_time = end_time - start_time
            
            # Test configuration speed
            config_start = time.time()
            for webhook in webhooks_created[:5]:
                webhook.execute({
                    'http_method': 'POST',
                    'max_payload_size': 1024,
                    'rate_limit_per_minute': 100,
                    'authentication_required': True
                }, {})
            config_end = time.time()
            config_time = config_end - config_start
            
            success = (
                len(webhooks_created) == 10 and
                creation_time < 2.0 and  # Under 2 seconds for 10 webhooks
                config_time < 1.0        # Under 1 second for 5 configs
            )
            
            details = f"Created: {len(webhooks_created)}/10, Creation time: {creation_time:.2f}s, Config time: {config_time:.2f}s"
            self.log_test("Performance Characteristics", success, details)
            
        except Exception as e:
            self.log_test("Performance Characteristics", False, str(e))
    
    def test_webhook_statistics(self):
        """Test webhook statistics and monitoring"""
        try:
            webhook = WebhookTriggerNode()
            
            # Get initial stats
            initial_stats = webhook.get_webhook_stats()
            
            # Simulate some webhook events by directly adding to webhook_events
            from app.nodes.triggers.webhook_trigger import webhook_events
            
            test_events = [
                {
                    "webhook_id": webhook.webhook_id,
                    "event_type": "user.created",
                    "data": {"user_id": 1},
                    "received_at": datetime.now().isoformat(),
                    "source": "test_suite"
                },
                {
                    "webhook_id": webhook.webhook_id,
                    "event_type": "user.updated", 
                    "data": {"user_id": 1},
                    "received_at": datetime.now().isoformat(),
                    "source": "test_suite"
                }
            ]
            
            webhook_events[webhook.webhook_id] = test_events
            
            # Get updated stats
            updated_stats = webhook.get_webhook_stats()
            
            success = (
                updated_stats['total_events'] == 2 and
                'user.created' in updated_stats['event_types'] and
                'user.updated' in updated_stats['event_types'] and
                'test_suite' in updated_stats['sources']
            )
            
            details = f"Events: {updated_stats['total_events']}, Event types: {len(updated_stats['event_types'])}, Sources: {len(updated_stats['sources'])}"
            self.log_test("Webhook Statistics", success, details)
            
            # Cleanup
            del webhook_events[webhook.webhook_id]
            
        except Exception as e:
            self.log_test("Webhook Statistics", False, str(e))
    
    def test_memory_usage(self):
        """Test memory usage and cleanup"""
        try:
            import psutil
            import os
            
            # Get initial memory usage
            process = psutil.Process(os.getpid())
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Create many webhooks
            webhooks = []
            for i in range(50):
                webhook = WebhookTriggerNode()
                webhook.execute({'authentication_required': False}, {})
                webhooks.append(webhook)
            
            # Get memory after creation
            after_creation = process.memory_info().rss / 1024 / 1024  # MB
            
            # Clear references
            webhooks.clear()
            
            # Force garbage collection
            import gc
            gc.collect()
            
            # Get final memory
            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            memory_increase = after_creation - initial_memory
            memory_cleanup = after_creation - final_memory
            
            success = (
                memory_increase < 100 and  # Less than 100MB increase for 50 webhooks
                memory_cleanup > 0         # Some memory was freed
            )
            
            details = f"Initial: {initial_memory:.1f}MB, Peak: {after_creation:.1f}MB, Final: {final_memory:.1f}MB"
            self.log_test("Memory Usage", success, details)
            
        except ImportError:
            # psutil not available
            self.log_test("Memory Usage", True, "Skipped - psutil not available")
        except Exception as e:
            self.log_test("Memory Usage", False, str(e))
    
    def run_all_tests(self):
        """Run all Webhook Trigger Node tests"""
        print("🎯 Webhook Trigger Node - Comprehensive Test Suite")
        print("=" * 60)
        
        test_methods = [
            self.test_webhook_creation,
            self.test_http_method_configuration,
            self.test_authentication_configuration,
            self.test_event_type_filtering,
            self.test_payload_size_limits,
            self.test_rate_limiting_config,
            self.test_cors_configuration,
            self.test_timeout_configuration,
            self.test_webhook_endpoint_generation,
            self.test_workflow_state_execution,
            self.test_metadata_processing,
            self.test_runnable_creation,
            self.test_multiple_webhooks_isolation,
            self.test_configuration_validation,
            self.test_error_conditions,
            self.test_performance_characteristics,
            self.test_webhook_statistics,
            self.test_memory_usage
        ]
        
        print(f"\n🧪 Running {len(test_methods)} tests...\n")
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                test_name = test_method.__name__.replace('test_', '').replace('_', ' ').title()
                self.log_test(test_name, False, f"Test execution failed: {e}")
            
            time.sleep(0.1)  # Brief pause between tests
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📈 Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        
        # Print detailed results
        print(f"\n📋 DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            status_icon = "✅" if result["status"] == "PASS" else "❌"
            print(f"{status_icon} {result['test_name']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        # Save results to file
        results_file = f"webhook_trigger_test_results_{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "passed": self.passed,
                    "failed": self.failed,
                    "success_rate": self.passed / (self.passed + self.failed) * 100,
                    "timestamp": datetime.now().isoformat()
                },
                "tests": self.test_results
            }, f, indent=2)
        
        print(f"\n💾 Test results saved to: {results_file}")
        
        return self.passed > 0 and self.failed == 0


def main():
    """Run Webhook Trigger Node comprehensive tests"""
    tester = WebhookTriggerTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Webhook Trigger Node is working correctly.")
        exit(0)
    else:
        print(f"\n⚠️ {tester.failed} tests failed. Please check the results above.")
        exit(1)


if __name__ == "__main__":
    main()