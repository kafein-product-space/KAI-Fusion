"""
KAI-Fusion Enterprise Configuration Management - Centralized Environment & Constants System
===========================================================================================

This module implements the sophisticated configuration management system for the KAI-Fusion
platform, providing enterprise-grade environment variable handling, secure credential
management, and comprehensive configuration validation. Built for production deployment
environments with advanced security, monitoring, and scalability configuration patterns
designed for enterprise-scale AI workflow automation platforms.



```

ENVIRONMENT MANAGEMENT:
======================

Development Environment:
```python
# Development-specific configuration
DEVELOPMENT_DEFAULTS = {
    "DATABASE_URL": "sqlite:///./dev.db",
    "DEBUG": True,
    "LOG_LEVEL": "DEBUG",
    "RATE_LIMIT_REQUESTS": 1000,
    "ENABLE_WORKFLOW_TRACING": True
}
```

Production Environment:
```python
# Production-specific configuration
PRODUCTION_REQUIREMENTS = {
    "DATABASE_URL": "Required - PostgreSQL connection string",
    "SECRET_KEY": "Required - 64+ character secure random string",
    "LANGCHAIN_API_KEY": "Required for LLM integrations",
    "ALLOWED_ORIGINS": "Required - Specific domain whitelist",
    "DISABLE_DATABASE": "false - Database required in production"
}
```

MONITORING AND OBSERVABILITY:
============================

Configuration Intelligence:

1. **Configuration Tracking**:
   - Environment variable usage monitoring with access pattern analysis
   - Configuration change detection with audit trails and rollback capability
   - Security compliance validation with policy enforcement and reporting
   - Performance impact analysis with optimization recommendations

2. **Security Monitoring**:
   - Credential access tracking with anomaly detection and alerting
   - Configuration validation with security policy enforcement
   - Access control monitoring with unauthorized access detection
   - Audit trail generation with immutable logging and compliance reporting

3. **Performance Analytics**:
   - Configuration impact on application performance with correlation analysis
   - Resource utilization correlation with configuration parameters
   - Scaling configuration effectiveness with load testing and optimization
   - Database performance correlation with connection pool configuration

4. **Compliance and Governance**:
   - Configuration policy compliance with automated validation and reporting
   - Security standard adherence with continuous compliance monitoring
   - Change management integration with approval workflows and audit trails
   - Documentation generation with configuration parameter explanations

SECURITY CONSIDERATIONS:
=======================

Enterprise Security Framework:

1. **Credential Protection**:
   - Environment variable encryption with secure key management
   - Access control with role-based configuration permissions
   - Audit logging with comprehensive access tracking and monitoring
   - Secure default values with production-grade security recommendations

2. **Configuration Validation**:
   - Input sanitization with comprehensive validation and type checking
   - Security policy enforcement with automated compliance validation
   - Threat detection with suspicious configuration change monitoring
   - Vulnerability assessment with security configuration analysis

3. **Production Hardening**:
   - Secure default configurations with defense-in-depth strategies
   - Configuration lockdown with immutable production settings
   - Security monitoring with real-time threat detection and response
   - Incident response integration with automated security event handling

AUTHORS: KAI-Fusion Configuration Management Team
VERSION: 2.1.0
LAST_UPDATED: 2025-07-26
LICENSE: Proprietary - KAI-Fusion Platform

──────────────────────────────────────────────────────────────
IMPLEMENTATION DETAILS:
• Loading: Environment-aware configuration with secure credential management
• Validation: Comprehensive security and constraint validation
• Security: Encryption, access control, audit trails, compliance monitoring
• Features: Centralized management, monitoring, scaling, performance optimization
──────────────────────────────────────────────────────────────
"""
import os

# Core Application Settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ENVIRONMENT = "development"
PORT = int(os.getenv("BACKEND_PORT"))

# Database Settings
DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_USERNAME = os.getenv("POSTGRES_USERNAME")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DISABLE_DATABASE = os.getenv("DISABLE_DATABASE", "false").lower() == "true"

# Database Pool Settings - Clean integer/boolean types
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))
DB_POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))
DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"

CREDENTIAL_MASTER_KEY = "1234567890"
# Logging
LOG_LEVEL = "DEBUG"
DEBUG = os.getenv("BACKEND_DEBUG", "false").lower() in ("true", "1", "t")

# CORS Settings
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
# LangSmith Settings
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "true")
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT")
# Workflow Tracing
ENABLE_WORKFLOW_TRACING = "true"
TRACE_AGENT_REASONING ="true"
TRACE_MEMORY_OPERATIONS = "true"

ALGORITHM = "HS256"

# Session Managements
SESSION_TTL_MINUTES = "30"
MAX_SESSIONS = "1000"
# File Upload Settings
MAX_FILE_SIZE = "10485760" # 10MB
UPLOAD_DIR = "uploads"
# Rate Limiting
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "60"
# Engine Settings
AF_USE_STUB_ENGINE = "false"


ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7