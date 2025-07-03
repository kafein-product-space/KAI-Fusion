"""
Basic API Tests - Status 200 checks and health endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestHealthEndpoints:
    """Test health and basic endpoints return 200"""
    
    def test_root_endpoint_returns_200(self):
        """Test root endpoint returns 200 and basic info"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "app" in data
        assert "version" in data
        assert "message" in data
    
    def test_health_endpoint_returns_200(self):
        """Test health endpoint returns 200 with component status"""
        response = client.get("/api/health")
        assert response.status_code in [200, 503]  # 503 if components not ready
        
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "components" in data
    
    def test_info_endpoint_returns_200(self):
        """Test info endpoint returns 200 with API details"""
        response = client.get("/api/v1/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data
        assert "features" in data
        assert "stats" in data

class TestAPIDocumentation:
    """Test API documentation endpoints"""
    
    def test_openapi_json_returns_200(self):
        """Test OpenAPI schema is accessible"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data
    
    def test_docs_endpoint_accessible(self):
        """Test Swagger UI is accessible"""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
    
    def test_redoc_endpoint_accessible(self):
        """Test ReDoc is accessible"""
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

class TestNodeEndpoints:
    """Test node registry endpoints"""
    
    def test_nodes_list_returns_response(self):
        """Test nodes list endpoint returns a response (may require auth)"""
        response = client.get("/api/v1/nodes")
        # Can be 200 (public) or 403 (requires auth) - both are valid behaviors
        assert response.status_code in [200, 403]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
    
    def test_node_categories_returns_200(self):
        """Test node categories endpoint returns 200"""
        response = client.get("/api/v1/nodes/categories")
        assert response.status_code == 200
        
        data = response.json()
        # Categories endpoint returns a list, not dict
        assert isinstance(data, list)
        if data:  # If not empty
            assert "name" in data[0]

class TestAuthEndpoints:
    """Test authentication endpoints (without credentials)"""
    
    def test_auth_signup_endpoint_accessible(self):
        """Test signup endpoint structure (422 expected without body)"""
        response = client.post("/api/v1/auth/signup")
        # Should return 422 (validation error) not 404 (not found)
        assert response.status_code == 422
    
    def test_auth_signin_endpoint_accessible(self):
        """Test signin endpoint structure (422 expected without body)"""
        response = client.post("/api/v1/auth/signin")
        # Should return 422 (validation error) not 404 (not found)
        assert response.status_code == 422
    
    def test_auth_user_endpoint_behavior(self):
        """Test user endpoint behavior (may not exist or require auth)"""
        response = client.get("/api/v1/auth/user")
        # Can be 404 (not implemented), 401 (unauthorized), or 403 (forbidden)
        assert response.status_code in [401, 403, 404]

class TestWorkflowEndpoints:
    """Test workflow endpoints (without auth)"""
    
    def test_workflows_list_needs_auth(self):
        """Test workflows list requires authentication"""
        response = client.get("/api/v1/workflows")
        # Should return 401/403 (unauthorized) not 404 (not found)
        assert response.status_code in [401, 403]
    
    def test_workflow_execute_endpoint_behavior(self):
        """Test execute endpoint behavior"""
        response = client.post("/api/v1/workflows/execute")
        # Can be 422 (validation error), 405 (method not allowed), or 401 (auth required)
        assert response.status_code in [405, 422, 401, 403]

class TestErrorHandling:
    """Test error handling"""
    
    def test_404_on_nonexistent_endpoint(self):
        """Test 404 for non-existent endpoints"""
        response = client.get("/api/v1/nonexistent")
        assert response.status_code == 404
    
    def test_method_not_allowed(self):
        """Test 405 for wrong HTTP methods"""
        response = client.post("/")  # GET-only endpoint
        assert response.status_code == 405

# Simple smoke tests
def test_app_starts_successfully():
    """Test that the app starts without errors"""
    response = client.get("/")
    assert response is not None
    assert response.status_code == 200

def test_api_returns_json():
    """Test that API endpoints return JSON"""
    endpoints = ["/", "/api/health", "/api/v1/info"]
    
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert "application/json" in response.headers["content-type"]

@pytest.mark.parametrize("endpoint,expected_codes", [
    ("/", [200]),
    ("/api/health", [200, 503]),
    ("/api/v1/info", [200]),
    ("/api/v1/nodes", [200, 403]),  # May require auth
    ("/api/v1/nodes/categories", [200]),
    ("/docs", [200]),
    ("/redoc", [200]),
    ("/openapi.json", [200])
])
def test_endpoints_are_accessible(endpoint, expected_codes):
    """Parameterized test: all public endpoints should be accessible"""
    response = client.get(endpoint)
    assert response.status_code in expected_codes 