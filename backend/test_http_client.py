#!/usr/bin/env python3
"""
HTTP Client Node - Comprehensive Testing Suite
===============================================

This test suite validates all features and capabilities of the HTTP Client Node
including all HTTP methods, authentication types, content types, templating,
error handling, and performance characteristics.

Test Categories:
- HTTP Methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Authentication (Bearer, Basic, API Key, Custom Headers)
- Content Types (JSON, Form Data, Multipart, XML, Text)
- Template Engine (Jinja2 templating)
- Error Handling & Retry Logic
- Performance & Monitoring
- Security Features
"""

import asyncio
import json
import time
import uuid
from typing import Dict, Any, List
from datetime import datetime

from app.nodes.tools.http_client import HttpClientNode

class HttpClientTester:
    def __init__(self):
        self.node = HttpClientNode()
        self.test_results = []
        self.passed = 0
        self.failed = 0
        
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
    
    def test_get_request(self):
        """Test GET request functionality"""
        try:
            inputs = {
                "url": "https://jsonplaceholder.typicode.com/posts/1",
                "method": "GET",
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "data" in result and
                isinstance(result["data"], dict)
            )
            
            details = f"Status: {result.get('status_code')}, Response Time: {result.get('response_time', 0):.3f}s"
            self.log_test("GET Request - JSONPlaceholder", success, details)
            
        except Exception as e:
            self.log_test("GET Request - JSONPlaceholder", False, str(e))
    
    def test_post_request(self):
        """Test POST request with JSON body"""
        try:
            inputs = {
                "url": "https://jsonplaceholder.typicode.com/posts",
                "method": "POST",
                "content_type": "application/json",
                "body": json.dumps({
                    "title": "Test Post",
                    "body": "This is a test post from KAI-Fusion HTTP Client",
                    "userId": 1
                }),
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 201 and
                "data" in result and
                isinstance(result["data"], dict)
            )
            
            details = f"Status: {result.get('status_code')}, Created ID: {result.get('data', {}).get('id', 'N/A')}"
            self.log_test("POST Request - Create Resource", success, details)
            
        except Exception as e:
            self.log_test("POST Request - Create Resource", False, str(e))
    
    def test_put_request(self):
        """Test PUT request for resource update"""
        try:
            inputs = {
                "url": "https://jsonplaceholder.typicode.com/posts/1",
                "method": "PUT",
                "content_type": "application/json", 
                "body": json.dumps({
                    "id": 1,
                    "title": "Updated Test Post",
                    "body": "This post has been updated via KAI-Fusion HTTP Client",
                    "userId": 1
                }),
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "data" in result
            )
            
            details = f"Status: {result.get('status_code')}, Updated ID: {result.get('data', {}).get('id', 'N/A')}"
            self.log_test("PUT Request - Update Resource", success, details)
            
        except Exception as e:
            self.log_test("PUT Request - Update Resource", False, str(e))
    
    def test_patch_request(self):
        """Test PATCH request for partial update"""
        try:
            inputs = {
                "url": "https://jsonplaceholder.typicode.com/posts/1",
                "method": "PATCH",
                "content_type": "application/json",
                "body": json.dumps({
                    "title": "Partially Updated Title"
                }),
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "data" in result
            )
            
            details = f"Status: {result.get('status_code')}, Patched ID: {result.get('data', {}).get('id', 'N/A')}"
            self.log_test("PATCH Request - Partial Update", success, details)
            
        except Exception as e:
            self.log_test("PATCH Request - Partial Update", False, str(e))
    
    def test_delete_request(self):
        """Test DELETE request"""
        try:
            inputs = {
                "url": "https://jsonplaceholder.typicode.com/posts/1",
                "method": "DELETE",
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = result.get("status_code") == 200
            
            details = f"Status: {result.get('status_code')}, Response: {result.get('data', {})}"
            self.log_test("DELETE Request - Remove Resource", success, details)
            
        except Exception as e:
            self.log_test("DELETE Request - Remove Resource", False, str(e))
    
    def test_head_request(self):
        """Test HEAD request for headers only"""
        try:
            inputs = {
                "url": "https://jsonplaceholder.typicode.com/posts/1",
                "method": "HEAD",
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "headers" in result
            )
            
            details = f"Status: {result.get('status_code')}, Headers Count: {len(result.get('headers', {}))}"
            self.log_test("HEAD Request - Headers Only", success, details)
            
        except Exception as e:
            self.log_test("HEAD Request - Headers Only", False, str(e))
    
    def test_bearer_authentication(self):
        """Test Bearer Token Authentication"""
        try:
            # Using a mock API that accepts any bearer token
            inputs = {
                "url": "https://httpbin.org/bearer",
                "method": "GET",
                "auth_type": "bearer",
                "auth_token": "test_jwt_token_123",
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "authenticated" in result.get("data", {})
            )
            
            details = f"Status: {result.get('status_code')}, Authenticated: {result.get('data', {}).get('authenticated', False)}"
            self.log_test("Bearer Token Authentication", success, details)
            
        except Exception as e:
            self.log_test("Bearer Token Authentication", False, str(e))
    
    def test_basic_authentication(self):
        """Test Basic Authentication"""
        try:
            inputs = {
                "url": "https://httpbin.org/basic-auth/testuser/testpass",
                "method": "GET",
                "auth_type": "basic",
                "auth_username": "testuser",
                "auth_password": "testpass",
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "authenticated" in result.get("data", {})
            )
            
            details = f"Status: {result.get('status_code')}, User: {result.get('data', {}).get('user', 'N/A')}"
            self.log_test("Basic Authentication", success, details)
            
        except Exception as e:
            self.log_test("Basic Authentication", False, str(e))
    
    def test_custom_headers(self):
        """Test Custom Headers"""
        try:
            custom_headers = {
                "X-API-Key": "test_api_key_123",
                "X-Client-Version": "KAI-Fusion/2.1.0",
                "X-Request-ID": str(uuid.uuid4())
            }
            
            inputs = {
                "url": "https://httpbin.org/headers",
                "method": "GET",
                "headers": json.dumps(custom_headers),
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            # Check if our custom headers were sent
            sent_headers = result.get("data", {}).get("headers", {})
            success = (
                result.get("status_code") == 200 and
                "X-Api-Key" in sent_headers and
                "X-Client-Version" in sent_headers
            )
            
            details = f"Status: {result.get('status_code')}, Custom Headers Sent: {len(custom_headers)}"
            self.log_test("Custom Headers", success, details)
            
        except Exception as e:
            self.log_test("Custom Headers", False, str(e))
    
    def test_form_data(self):
        """Test Form Data Content Type"""
        try:
            form_data = {
                "name": "John Doe",
                "email": "john@example.com",
                "message": "Test form submission from KAI-Fusion"
            }
            
            inputs = {
                "url": "https://httpbin.org/post",
                "method": "POST",
                "content_type": "application/x-www-form-urlencoded",
                "body": form_data,
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "form" in result.get("data", {})
            )
            
            form_received = result.get("data", {}).get("form", {})
            details = f"Status: {result.get('status_code')}, Form Fields: {len(form_received)}"
            self.log_test("Form Data Content Type", success, details)
            
        except Exception as e:
            self.log_test("Form Data Content Type", False, str(e))
    
    def test_jinja_templating(self):
        """Test Jinja2 Template Engine"""
        try:
            # Template context
            context = {
                "user_id": 123,
                "action": "profile_update",
                "timestamp": int(time.time()),
                "data": {
                    "name": "Alice Smith",
                    "email": "alice@example.com"
                }
            }
            
            # Template in URL and body
            inputs = {
                "url": "https://httpbin.org/anything/user/{{user_id}}",
                "method": "POST",
                "content_type": "application/json",
                "body": json.dumps({
                    "action": "{{action}}",
                    "timestamp": "{{timestamp}}",
                    "user_data": {
                        "name": "{{data.name}}",
                        "email": "{{data.email}}"
                    },
                    "message": "{% if user_id > 100 %}Premium User{% else %}Basic User{% endif %}"
                }),
                "enable_templating": True,
                "timeout": 10
            }
            
            result = self.node.execute(inputs, context)
            
            # Check if templating worked
            response_data = result.get("data", {})
            success = (
                result.get("status_code") == 200 and
                "user/123" in response_data.get("url", "") and
                "Premium User" in json.dumps(response_data.get("json", {}))
            )
            
            details = f"Status: {result.get('status_code')}, Template Variables Resolved"
            self.log_test("Jinja2 Template Engine", success, details)
            
        except Exception as e:
            self.log_test("Jinja2 Template Engine", False, str(e))
    
    def test_error_handling(self):
        """Test Error Handling and HTTP Status Codes"""
        try:
            # Test 404 Not Found
            inputs = {
                "url": "https://httpbin.org/status/404",
                "method": "GET",
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = result.get("status_code") == 404
            
            details = f"Status: {result.get('status_code')}, Error Handled Correctly"
            self.log_test("Error Handling - 404 Not Found", success, details)
            
            # Test timeout handling
            try:
                timeout_inputs = {
                    "url": "https://httpbin.org/delay/5",
                    "method": "GET",
                    "timeout": 2  # 2 second timeout for 5 second delay
                }
                
                timeout_result = self.node.execute(timeout_inputs, {})
                # Should not reach here due to timeout
                self.log_test("Timeout Handling", False, "Timeout not triggered")
                
            except Exception as timeout_error:
                if "timeout" in str(timeout_error).lower():
                    self.log_test("Timeout Handling", True, "Timeout handled correctly")
                else:
                    self.log_test("Timeout Handling", False, f"Unexpected error: {timeout_error}")
            
        except Exception as e:
            self.log_test("Error Handling - 404 Not Found", False, str(e))
    
    def test_performance_metrics(self):
        """Test Performance Monitoring"""
        try:
            inputs = {
                "url": "https://httpbin.org/json",
                "method": "GET",
                "timeout": 10
            }
            
            start_time = time.time()
            result = self.node.execute(inputs, {})
            end_time = time.time()
            
            # Check if performance metrics are included
            has_response_time = "response_time" in result
            response_time = result.get("response_time", 0)
            total_time = end_time - start_time
            
            success = (
                result.get("status_code") == 200 and
                has_response_time and
                response_time > 0 and
                response_time < total_time + 1  # Allow some margin
            )
            
            details = f"Response Time: {response_time:.3f}s, Total Time: {total_time:.3f}s"
            self.log_test("Performance Metrics", success, details)
            
        except Exception as e:
            self.log_test("Performance Metrics", False, str(e))
    
    def test_ssl_verification(self):
        """Test SSL Certificate Verification"""
        try:
            # Test with valid SSL
            inputs = {
                "url": "https://httpbin.org/get",
                "method": "GET",
                "verify_ssl": True,
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = result.get("status_code") == 200
            details = f"Status: {result.get('status_code')}, SSL Verified"
            self.log_test("SSL Certificate Verification", success, details)
            
            # Test SSL verification disabled
            insecure_inputs = {
                "url": "https://httpbin.org/get",
                "method": "GET", 
                "verify_ssl": False,
                "timeout": 10
            }
            
            insecure_result = self.node.execute(insecure_inputs, {})
            
            insecure_success = insecure_result.get("status_code") == 200
            insecure_details = f"Status: {insecure_result.get('status_code')}, SSL Verification Disabled"
            self.log_test("SSL Verification Disabled", insecure_success, insecure_details)
            
        except Exception as e:
            self.log_test("SSL Certificate Verification", False, str(e))
    
    def test_compression_support(self):
        """Test Compression Support"""
        try:
            inputs = {
                "url": "https://httpbin.org/gzip",
                "method": "GET",
                "headers": json.dumps({"Accept-Encoding": "gzip, deflate"}),
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = (
                result.get("status_code") == 200 and
                "gzipped" in result.get("data", {})
            )
            
            details = f"Status: {result.get('status_code')}, Compression Supported"
            self.log_test("Compression Support", success, details)
            
        except Exception as e:
            self.log_test("Compression Support", False, str(e))
    
    def test_redirect_handling(self):
        """Test Redirect Handling"""
        try:
            # Test redirect following
            inputs = {
                "url": "https://httpbin.org/redirect/2",
                "method": "GET",
                "follow_redirects": True,
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            success = result.get("status_code") == 200
            details = f"Status: {result.get('status_code')}, Redirects Followed"
            self.log_test("Redirect Following", success, details)
            
            # Test redirect disabled
            no_redirect_inputs = {
                "url": "https://httpbin.org/redirect/1",
                "method": "GET",
                "follow_redirects": False,
                "timeout": 10
            }
            
            no_redirect_result = self.node.execute(no_redirect_inputs, {})
            
            no_redirect_success = no_redirect_result.get("status_code") == 302
            no_redirect_details = f"Status: {no_redirect_result.get('status_code')}, Redirect Not Followed"
            self.log_test("Redirect Not Following", no_redirect_success, no_redirect_details)
            
        except Exception as e:
            self.log_test("Redirect Handling", False, str(e))
    
    def test_json_response_parsing(self):
        """Test JSON Response Parsing"""
        try:
            inputs = {
                "url": "https://jsonplaceholder.typicode.com/users",
                "method": "GET",
                "timeout": 10
            }
            
            result = self.node.execute(inputs, {})
            
            users = result.get("data", [])
            success = (
                result.get("status_code") == 200 and
                isinstance(users, list) and
                len(users) > 0 and
                "name" in users[0]
            )
            
            details = f"Status: {result.get('status_code')}, Users Count: {len(users)}"
            self.log_test("JSON Response Parsing", success, details)
            
        except Exception as e:
            self.log_test("JSON Response Parsing", False, str(e))
    
    def run_all_tests(self):
        """Run all HTTP Client Node tests"""
        print("🚀 HTTP Client Node - Comprehensive Test Suite")
        print("=" * 60)
        
        test_methods = [
            self.test_get_request,
            self.test_post_request,
            self.test_put_request,
            self.test_patch_request,
            self.test_delete_request,
            self.test_head_request,
            self.test_bearer_authentication,
            self.test_basic_authentication,
            self.test_custom_headers,
            self.test_form_data,
            self.test_jinja_templating,
            self.test_error_handling,
            self.test_performance_metrics,
            self.test_ssl_verification,
            self.test_compression_support,
            self.test_redirect_handling,
            self.test_json_response_parsing
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
        results_file = f"http_client_test_results_{int(time.time())}.json"
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
    """Run HTTP Client Node comprehensive tests"""
    tester = HttpClientTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! HTTP Client Node is working correctly.")
        exit(0)
    else:
        print(f"\n⚠️ {tester.failed} tests failed. Please check the results above.")
        exit(1)


if __name__ == "__main__":
    main()