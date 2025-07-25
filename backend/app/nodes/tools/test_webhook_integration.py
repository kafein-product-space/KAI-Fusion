"""
Webhook & HTTP Integration Test Suite
───────────────────────────────────
• Purpose: Test complete webhook trigger and HTTP request workflow
• Features: End-to-end testing, mock servers, authentication testing
• Coverage: WebhookTrigger → Workflow → HttpRequest → External API
• Validation: Request/response handling, error scenarios, performance
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List
import uuid
import httpx
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
import uvicorn
from threading import Thread

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock external API server
class MockAPIServer:
    """Mock external API server for testing HTTP requests."""
    
    def __init__(self, port: int = 8001):
        self.port = port
        self.app = FastAPI()
        self.received_requests: List[Dict[str, Any]] = []
        self._setup_routes()
        self.server = None
        self.thread = None
    
    def _setup_routes(self):
        """Setup mock API routes."""
        
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
        
        @self.app.post("/api/webhook-callback")
        async def webhook_callback(request: Request):
            """Mock webhook callback endpoint."""
            body = await request.body()
            payload = json.loads(body) if body else {}
            
            request_data = {
                "method": request.method,
                "url": str(request.url),
                "headers": dict(request.headers),
                "payload": payload,
                "timestamp": datetime.now().isoformat(),
                "request_id": str(uuid.uuid4())
            }
            
            self.received_requests.append(request_data)
            
            return {
                "success": True,
                "message": "Webhook callback received",
                "request_id": request_data["request_id"],
                "processed_at": datetime.now().isoformat()
            }
        
        @self.app.get("/api/data/{item_id}")
        async def get_data(item_id: str):
            """Mock data retrieval endpoint."""
            return {
                "item_id": item_id,
                "data": f"Mock data for {item_id}",
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.post("/api/process")
        async def process_data(request: Request):
            """Mock data processing endpoint."""
            body = await request.body()
            payload = json.loads(body) if body else {}
            
            # Simulate processing
            await asyncio.sleep(0.1)
            
            return {
                "processed": True,
                "input_data": payload,
                "result": f"Processed {len(str(payload))} characters",
                "processing_time_ms": 100,
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.post("/api/auth-required")
        async def auth_required_endpoint(request: Request):
            """Mock endpoint requiring authentication."""
            auth_header = request.headers.get("authorization")
            
            if not auth_header or not auth_header.startswith("Bearer "):
                return {"error": "Missing or invalid authorization header"}, 401
            
            token = auth_header.replace("Bearer ", "")
            if token != "test-token-123":
                return {"error": "Invalid token"}, 401
            
            return {
                "authenticated": True,
                "user": "test-user",
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.get("/api/slow-endpoint")
        async def slow_endpoint():
            """Mock slow endpoint for timeout testing."""
            await asyncio.sleep(5)  # 5 second delay
            return {"message": "This endpoint is slow"}
        
        @self.app.get("/api/error-endpoint")
        async def error_endpoint():
            """Mock endpoint that always returns an error."""
            return {"error": "Simulated server error"}, 500
    
    def start(self):
        """Start the mock API server."""
        def run_server():
            uvicorn.run(self.app, host="127.0.0.1", port=self.port, log_level="warning")
        
        self.thread = Thread(target=run_server, daemon=True)
        self.thread.start()
        
        # Wait for server to start
        time.sleep(1)
        logger.info(f"🚀 Mock API server started on port {self.port}")
    
    def stop(self):
        """Stop the mock API server."""
        if self.thread:
            self.thread.join(timeout=1)
        logger.info("🛑 Mock API server stopped")
    
    def get_received_requests(self) -> List[Dict[str, Any]]:
        """Get all received requests."""
        return self.received_requests.copy()
    
    def clear_requests(self):
        """Clear received requests history."""
        self.received_requests.clear()

class WebhookIntegrationTester:
    """
    Comprehensive webhook and HTTP request integration tester.
    """
    
    def __init__(self):
        self.mock_server = MockAPIServer()
        self.test_results: List[Dict[str, Any]] = []
        
        # Mock nodes for testing
        self.mock_webhook_node = None
        self.mock_http_node = None
        
        logger.info("🧪 Webhook Integration Tester initialized")
    
    def setup_test_environment(self):
        """Setup test environment with mock servers."""
        # Start mock API server
        self.mock_server.start()
        
        # Import and setup nodes (mock import for now)
        logger.info("⚙️ Setting up test environment...")
    
    def teardown_test_environment(self):
        """Cleanup test environment."""
        self.mock_server.stop()
        logger.info("🧹 Test environment cleaned up")
    
    async def test_webhook_trigger_basic(self) -> Dict[str, Any]:
        """Test basic webhook trigger functionality."""
        logger.info("🔧 Testing Basic Webhook Trigger...")
        
        # Mock webhook trigger node
        from ..triggers.webhook_trigger import WebhookTriggerNode
        
        webhook_node = WebhookTriggerNode()
        
        # Configure webhook
        webhook_result = webhook_node.execute(
            authentication_required=False,
            max_payload_size=1024,
            rate_limit_per_minute=100
        )
        
        webhook_endpoint = webhook_result["webhook_endpoint"]
        webhook_runnable = webhook_result["webhook_runnable"]
        
        # Test webhook creation
        test_result = {
            "test_name": "webhook_trigger_basic",
            "webhook_endpoint": webhook_endpoint,
            "webhook_config": webhook_result["webhook_config"],
            "success": webhook_endpoint is not None,
        }
        
        # Simulate webhook call
        test_payload = {
            "event_type": "test.event",
            "data": {"message": "Test webhook payload", "timestamp": datetime.now().isoformat()},
            "source": "integration_test"
        }
        
        # Mock webhook reception (in real scenario, this would be HTTP POST)
        try:
            # This would be triggered by actual HTTP POST in production
            webhook_event = {
                "webhook_id": webhook_node.webhook_id,
                "event_type": test_payload["event_type"],
                "data": test_payload["data"],
                "source": test_payload["source"],
                "received_at": datetime.now().isoformat(),
            }
            
            # Store mock event
            from ..triggers.webhook_trigger import webhook_events
            webhook_events[webhook_node.webhook_id].append(webhook_event)
            
            # Test webhook runnable
            latest_event = await webhook_runnable.ainvoke(None)
            
            test_result.update({
                "webhook_triggered": True,
                "received_payload": latest_event,
                "payload_matches": latest_event.get("data") == test_payload["data"],
            })
            
        except Exception as e:
            test_result.update({
                "webhook_triggered": False,
                "error": str(e),
            })
        
        logger.info(f"✅ Webhook trigger test completed: {test_result['success']}")
        return test_result
    
    async def test_http_request_basic(self) -> Dict[str, Any]:
        """Test basic HTTP request functionality."""
        logger.info("🔧 Testing Basic HTTP Request...")
        
        from ..tools.http_request import HttpRequestNode
        
        http_node = HttpRequestNode()
        
        # Test GET request to mock server
        request_config = {
            "method": "GET",
            "url": f"http://127.0.0.1:{self.mock_server.port}/health",
            "timeout": 10,
            "verify_ssl": False,
        }
        
        try:
            result = http_node.execute(
                inputs=request_config,
                connected_nodes={}
            )
            
            test_result = {
                "test_name": "http_request_basic",
                "success": result["success"],
                "status_code": result["status_code"],
                "response_content": result["content"],
                "request_stats": result["request_stats"],
            }
            
        except Exception as e:
            test_result = {
                "test_name": "http_request_basic",
                "success": False,
                "error": str(e),
            }
        
        logger.info(f"✅ HTTP request test completed: {test_result['success']}")
        return test_result
    
    async def test_http_request_with_auth(self) -> Dict[str, Any]:
        """Test HTTP request with authentication."""
        logger.info("🔧 Testing HTTP Request with Authentication...")
        
        from ..tools.http_request import HttpRequestNode
        
        http_node = HttpRequestNode()
        
        # Test authenticated request
        request_config = {
            "method": "POST",
            "url": f"http://127.0.0.1:{self.mock_server.port}/api/auth-required",
            "auth_type": "bearer",
            "auth_token": "test-token-123",
            "content_type": "json",
            "body": json.dumps({"test": "data"}),
            "timeout": 10,
            "verify_ssl": False,
        }
        
        try:
            result = http_node.execute(
                inputs=request_config,
                connected_nodes={}
            )
            
            test_result = {
                "test_name": "http_request_auth",
                "success": result["success"],
                "status_code": result["status_code"],
                "authenticated": result["content"].get("authenticated", False) if result["content"] else False,
                "request_stats": result["request_stats"],
            }
            
        except Exception as e:
            test_result = {
                "test_name": "http_request_auth",
                "success": False,
                "error": str(e),
            }
        
        logger.info(f"✅ HTTP auth test completed: {test_result['success']}")
        return test_result
    
    async def test_webhook_to_http_workflow(self) -> Dict[str, Any]:
        """Test complete webhook → workflow → HTTP request flow."""
        logger.info("🔧 Testing Webhook → HTTP Workflow...")
        
        try:
            from ..triggers.webhook_trigger import WebhookTriggerNode
            from ..tools.http_request import HttpRequestNode
            
            # Setup webhook trigger
            webhook_node = WebhookTriggerNode()
            webhook_result = webhook_node.execute(authentication_required=False)
            webhook_runnable = webhook_result["webhook_runnable"]
            
            # Setup HTTP request node
            http_node = HttpRequestNode()
            
            # Simulate incoming webhook
            webhook_payload = {
                "event_type": "data.process_request",
                "data": {
                    "item_id": "test-item-123",
                    "action": "process",
                    "callback_url": f"http://127.0.0.1:{self.mock_server.port}/api/webhook-callback"
                },
                "source": "external_system"
            }
            
            # Mock webhook reception
            from ..triggers.webhook_trigger import webhook_events
            webhook_event = {
                "webhook_id": webhook_node.webhook_id,
                "event_type": webhook_payload["event_type"],
                "data": webhook_payload["data"],
                "received_at": datetime.now().isoformat(),
            }
            webhook_events[webhook_node.webhook_id].append(webhook_event)
            
            # Get webhook event
            received_event = await webhook_runnable.ainvoke(None)
            
            # Use webhook data to make HTTP request
            callback_url = received_event["data"]["callback_url"]
            
            # Process the data (simulate workflow processing)
            processing_result = {
                "original_item_id": received_event["data"]["item_id"],
                "processed_at": datetime.now().isoformat(),
                "status": "completed",
                "result": "Successfully processed webhook data"
            }
            
            # Send callback HTTP request
            callback_config = {
                "method": "POST",
                "url": callback_url,
                "content_type": "json",
                "body": json.dumps(processing_result),
                "timeout": 10,
                "verify_ssl": False,
            }
            
            http_result = http_node.execute(
                inputs=callback_config,
                connected_nodes={"template_context": received_event}
            )
            
            # Check if callback was received by mock server
            received_requests = self.mock_server.get_received_requests()
            callback_received = any(
                req["url"].endswith("/api/webhook-callback") 
                for req in received_requests
            )
            
            test_result = {
                "test_name": "webhook_to_http_workflow",
                "success": http_result["success"] and callback_received,
                "webhook_received": True,
                "webhook_data": received_event["data"],
                "http_request_sent": http_result["success"],
                "callback_received": callback_received,
                "end_to_end_success": http_result["success"] and callback_received,
                "processing_result": processing_result,
                "http_response": http_result["content"],
            }
            
        except Exception as e:
            test_result = {
                "test_name": "webhook_to_http_workflow",
                "success": False,
                "error": str(e),
            }
        
        logger.info(f"✅ Webhook → HTTP workflow test completed: {test_result['success']}")
        return test_result
    
    async def test_error_handling(self) -> Dict[str, Any]:
        """Test error handling scenarios."""
        logger.info("🔧 Testing Error Handling...")
        
        from ..tools.http_request import HttpRequestNode
        
        http_node = HttpRequestNode()
        
        # Test timeout scenario
        timeout_config = {
            "method": "GET",
            "url": f"http://127.0.0.1:{self.mock_server.port}/api/slow-endpoint",
            "timeout": 2,  # 2 second timeout, endpoint takes 5 seconds
            "max_retries": 1,
            "verify_ssl": False,
        }
        
        # Test error endpoint
        error_config = {
            "method": "GET",
            "url": f"http://127.0.0.1:{self.mock_server.port}/api/error-endpoint",
            "timeout": 10,
            "max_retries": 2,
            "verify_ssl": False,
        }
        
        test_results = {}
        
        # Test timeout
        try:
            timeout_result = http_node.execute(
                inputs=timeout_config,
                connected_nodes={}
            )
            test_results["timeout"] = {
                "expected_failure": True,
                "actually_failed": not timeout_result["success"],
                "error_handled": "timeout" in str(timeout_result.get("request_stats", {}).get("error", "")).lower()
            }
        except Exception as e:
            test_results["timeout"] = {
                "expected_failure": True,
                "actually_failed": True,
                "error_message": str(e)
            }
        
        # Test server error
        try:
            error_result = http_node.execute(
                inputs=error_config,
                connected_nodes={}
            )
            test_results["server_error"] = {
                "status_code": error_result["status_code"],
                "success": error_result["success"],
                "error_handled_correctly": error_result["status_code"] == 500
            }
        except Exception as e:
            test_results["server_error"] = {
                "exception_raised": True,
                "error_message": str(e)
            }
        
        overall_success = all(
            result.get("actually_failed", False) or result.get("error_handled_correctly", False)
            for result in test_results.values()
        )
        
        test_result = {
            "test_name": "error_handling",
            "success": overall_success,
            "error_scenarios": test_results,
        }
        
        logger.info(f"✅ Error handling test completed: {test_result['success']}")
        return test_result
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run complete integration test suite."""
        logger.info("🚀 Starting Webhook & HTTP Integration Tests...")
        
        # Setup test environment
        self.setup_test_environment()
        
        test_results = {}
        start_time = datetime.now()
        
        try:
            # Run individual tests
            test_results["webhook_basic"] = await self.test_webhook_trigger_basic()
            test_results["http_basic"] = await self.test_http_request_basic()
            test_results["http_auth"] = await self.test_http_request_with_auth()
            test_results["webhook_to_http"] = await self.test_webhook_to_http_workflow()
            test_results["error_handling"] = await self.test_error_handling()
            
        except Exception as e:
            logger.error(f"❌ Test suite failed: {str(e)}")
            test_results["suite_error"] = str(e)
        
        finally:
            # Cleanup
            self.teardown_test_environment()
        
        total_duration = (datetime.now() - start_time).total_seconds()
        
        # Calculate summary
        successful_tests = len([t for t in test_results.values() 
                              if isinstance(t, dict) and t.get("success", False)])
        total_tests = len([t for t in test_results.values() 
                          if isinstance(t, dict) and "test_name" in t])
        
        summary = {
            "test_suite": "Webhook & HTTP Integration Tests",
            "total_duration": total_duration,
            "successful_tests": successful_tests,
            "total_tests": total_tests,
            "success_rate": (successful_tests / total_tests * 100) if total_tests > 0 else 0,
            "test_results": test_results,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"📊 Integration Test Suite Complete: {successful_tests}/{total_tests} tests passed ({summary['success_rate']:.1f}%)")
        return summary

# Async execution function
async def main():
    """Run the webhook integration test suite."""
    tester = WebhookIntegrationTester()
    results = await tester.run_all_tests()
    
    print("\n" + "="*80)
    print("WEBHOOK & HTTP INTEGRATION TEST RESULTS")
    print("="*80)
    print(f"Duration: {results['total_duration']:.1f} seconds")
    print(f"Success Rate: {results['success_rate']:.1f}% ({results['successful_tests']}/{results['total_tests']})")
    print("\nTest Details:")
    
    for test_name, result in results["test_results"].items():
        if isinstance(result, dict) and "success" in result:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"  {status} {test_name}")
            if not result["success"] and "error" in result:
                print(f"    Error: {result['error']}")
    
    print("="*80)
    return results

if __name__ == "__main__":
    # Run the test suite
    asyncio.run(main())