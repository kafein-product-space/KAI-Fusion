"""Centralized Exception Handling for Agent-Flow V2.

Provides custom exceptions, error response models, and HTTP status
mapping for consistent error handling across the application.
"""

from typing import Any, Dict, Optional, List
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import logging
import traceback
from uuid import uuid4
from datetime import datetime

# Service layer exceptions - Define them here since they don't exist in base.py
class ServiceError(Exception):
    """Base service layer exception."""
    pass

class ValidationError(Exception):
    """Validation error exception."""
    pass

class NotFoundError(Exception):
    """Not found error exception."""
    pass

class PermissionError(Exception):
    """Permission error exception."""
    pass

class BusinessRuleError(Exception):
    """Business rule violation exception."""
    pass

logger = logging.getLogger(__name__)

# Error Response Models

class ErrorDetail(BaseModel):
    """Individual error detail."""
    type: str
    message: str
    field: Optional[str] = None
    code: Optional[str] = None

class ErrorResponse(BaseModel):
    """Standardized error response."""
    success: bool = False
    error: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    request_id: Optional[str] = None
    timestamp: str

class ValidationErrorResponse(ErrorResponse):
    """Validation error response with field-specific errors."""
    validation_errors: List[Dict[str, Any]]

# Custom Exception Classes

class AgentFlowException(Exception):
    """Base exception for Agent-Flow application."""
    
    def __init__(
        self, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None
    ):
        self.message = message
        self.details = details or {}
        self.error_code = error_code
        super().__init__(self.message)

class DatabaseException(AgentFlowException):
    """Database-related exceptions."""
    pass

class AuthenticationException(AgentFlowException):
    """Authentication-related exceptions."""
    pass

class AuthorizationException(AgentFlowException):
    """Authorization-related exceptions."""
    pass

class RateLimitException(AgentFlowException):
    """Rate limiting exceptions."""
    pass

class ExternalServiceException(AgentFlowException):
    """External service integration exceptions."""
    pass

# Exception to HTTP Status Mapping

def get_http_status_for_exception(exc: Exception) -> int:
    """Map exceptions to appropriate HTTP status codes."""
    
    # Service layer exceptions
    if isinstance(exc, ValidationError):
        return status.HTTP_400_BAD_REQUEST
    elif isinstance(exc, NotFoundError):
        return status.HTTP_404_NOT_FOUND
    elif isinstance(exc, PermissionError):
        return status.HTTP_403_FORBIDDEN
    elif isinstance(exc, BusinessRuleError):
        return status.HTTP_409_CONFLICT
    elif isinstance(exc, ServiceError):
        return status.HTTP_500_INTERNAL_SERVER_ERROR
    
    # Application exceptions
    elif isinstance(exc, AuthenticationException):
        return status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, AuthorizationException):
        return status.HTTP_403_FORBIDDEN
    elif isinstance(exc, DatabaseException):
        return status.HTTP_503_SERVICE_UNAVAILABLE
    elif isinstance(exc, RateLimitException):
        return status.HTTP_429_TOO_MANY_REQUESTS
    elif isinstance(exc, ExternalServiceException):
        return status.HTTP_502_BAD_GATEWAY
    elif isinstance(exc, AgentFlowException):
        return status.HTTP_400_BAD_REQUEST
    
    # FastAPI exceptions
    elif isinstance(exc, HTTPException):
        return exc.status_code
    elif isinstance(exc, RequestValidationError):
        return status.HTTP_422_UNPROCESSABLE_ENTITY
    
    # Default for unknown exceptions
    else:
        return status.HTTP_500_INTERNAL_SERVER_ERROR

def get_error_type_for_exception(exc: Exception) -> str:
    """Get error type string for exception."""
    
    if isinstance(exc, ValidationError):
        return "VALIDATION_ERROR"
    elif isinstance(exc, NotFoundError):
        return "NOT_FOUND"
    elif isinstance(exc, PermissionError):
        return "PERMISSION_DENIED"
    elif isinstance(exc, BusinessRuleError):
        return "BUSINESS_RULE_VIOLATION"
    elif isinstance(exc, ServiceError):
        return "SERVICE_ERROR"
    elif isinstance(exc, AuthenticationException):
        return "AUTHENTICATION_ERROR"
    elif isinstance(exc, AuthorizationException):
        return "AUTHORIZATION_ERROR"
    elif isinstance(exc, DatabaseException):
        return "DATABASE_ERROR"
    elif isinstance(exc, RateLimitException):
        return "RATE_LIMIT_EXCEEDED"
    elif isinstance(exc, ExternalServiceException):
        return "EXTERNAL_SERVICE_ERROR"
    elif isinstance(exc, RequestValidationError):
        return "VALIDATION_ERROR"
    elif isinstance(exc, HTTPException):
        return "HTTP_ERROR"
    else:
        return "INTERNAL_ERROR"

# Exception Handlers

async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    """Handle service layer exceptions."""
    
    request_id = str(uuid4())
    status_code = get_http_status_for_exception(exc)
    error_type = get_error_type_for_exception(exc)
    
    # Log the error
    logger.error(
        f"Service error [{request_id}]: {exc.__class__.__name__}: {str(exc)}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "exception_type": exc.__class__.__name__
        }
    )
    
    error_response = ErrorResponse(
        error=error_type,
        message=str(exc),
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_response.model_dump()
    )

async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle FastAPI validation errors."""
    
    request_id = str(uuid4())
    
    # Extract validation errors
    validation_errors = []
    error_details = []
    
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        error_detail = ErrorDetail(
            type="VALIDATION_ERROR",
            message=error["msg"],
            field=field_path,
            code=error["type"]
        )
        error_details.append(error_detail)
        
        validation_errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })
    
    # Log validation error
    logger.warning(
        f"Validation error [{request_id}]: {len(validation_errors)} field errors",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "validation_errors": validation_errors
        }
    )
    
    error_response = ValidationErrorResponse(
        error="VALIDATION_ERROR",
        message=f"Request validation failed: {len(validation_errors)} field error(s)",
        details=error_details,
        validation_errors=validation_errors,
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump()
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""
    
    request_id = str(uuid4())
    error_type = get_error_type_for_exception(exc)
    
    # Log HTTP exception
    if exc.status_code >= 500:
        logger.error(
            f"HTTP error [{request_id}]: {exc.status_code} - {exc.detail}",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": exc.status_code
            }
        )
    else:
        logger.info(
            f"HTTP error [{request_id}]: {exc.status_code} - {exc.detail}",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": exc.status_code
            }
        )
    
    error_response = ErrorResponse(
        error=error_type,
        message=str(exc.detail),
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    
    request_id = str(uuid4())
    error_type = get_error_type_for_exception(exc)
    status_code = get_http_status_for_exception(exc)
    
    # Log full traceback for unexpected errors
    logger.error(
        f"Unexpected error [{request_id}]: {exc.__class__.__name__}: {str(exc)}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "exception_type": exc.__class__.__name__,
            "traceback": traceback.format_exc()
        }
    )
    
    # Don't expose internal error details in production
    error_message = str(exc) if status_code < 500 else "An internal error occurred"
    
    error_response = ErrorResponse(
        error=error_type,
        message=error_message,
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_response.model_dump()
    )

# Helper Functions

def create_http_exception(
    status_code: int,
    message: str,
    error_type: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> HTTPException:
    """Create standardized HTTP exception."""
    
    return HTTPException(
        status_code=status_code,
        detail={
            "error": error_type or get_error_type_for_status_code(status_code),
            "message": message,
            "details": details
        }
    )

def get_error_type_for_status_code(status_code: int) -> str:
    """Get error type for HTTP status code."""
    
    if status_code == 400:
        return "BAD_REQUEST"
    elif status_code == 401:
        return "UNAUTHORIZED"
    elif status_code == 403:
        return "FORBIDDEN"
    elif status_code == 404:
        return "NOT_FOUND"
    elif status_code == 409:
        return "CONFLICT"
    elif status_code == 422:
        return "UNPROCESSABLE_ENTITY"
    elif status_code == 429:
        return "TOO_MANY_REQUESTS"
    elif status_code == 500:
        return "INTERNAL_SERVER_ERROR"
    elif status_code == 502:
        return "BAD_GATEWAY"
    elif status_code == 503:
        return "SERVICE_UNAVAILABLE"
    else:
        return "HTTP_ERROR"

# Context Manager for Error Handling

class ErrorContext:
    """Context manager for structured error handling."""
    
    def __init__(self, operation: str, **context):
        self.operation = operation
        self.context = context
        self.request_id = str(uuid4())
    
    def __enter__(self):
        logger.debug(f"Starting operation [{self.request_id}]: {self.operation}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            logger.error(
                f"Operation failed [{self.request_id}]: {self.operation} - {exc_val}",
                extra={
                    "request_id": self.request_id,
                    "operation": self.operation,
                    "context": self.context,
                    "exception_type": exc_type.__name__ if exc_type else None
                }
            )
        else:
            logger.debug(f"Operation completed [{self.request_id}]: {self.operation}")
        
        return False  # Don't suppress exceptions 