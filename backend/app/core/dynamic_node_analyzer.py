# -*- coding: utf-8 -*-
"""
Dynamic Node Analyzer - Otomatik Environment Variable Detection
=============================================================

Bu modül node registry'den otomatik olarak environment variable ve dependency
detection yaparak workflow export sistemini tamamen dinamik hale getirir.

Temel özellikler:
- Node metadata'dan otomatik credential detection
- Environment variable naming convention'ları
- Package dependency analysis
- Security classification
- Runtime optimization
"""

from typing import Dict, Any, List, Optional, Set, Tuple
from dataclasses import dataclass
from datetime import datetime
import re
import importlib
import inspect
import logging

from app.core.node_registry import NodeRegistry, node_registry
from app.nodes.base import BaseNode, NodeMetadata, NodeInput, NodeOutput

logger = logging.getLogger(__name__)


@dataclass
class EnvironmentVariable:
    """Environment variable definition"""
    name: str
    description: str
    example: Optional[str] = None
    default: Optional[str] = None
    required: bool = True
    node_type: Optional[str] = None
    input_name: Optional[str] = None
    is_credential: bool = False
    data_type: str = "str"
    security_level: str = "medium"


@dataclass
class PackageDependency:
    """Package dependency definition"""
    name: str
    version: str
    category: str
    source_node: str
    required: bool = True


@dataclass
class WorkflowAnalysisResult:
    """Complete workflow analysis result"""
    node_types: List[str]
    environment_variables: List[EnvironmentVariable]
    package_dependencies: List[PackageDependency]
    security_requirements: Dict[str, Any]
    complexity_score: float
    analysis_timestamp: str


class CredentialDetector:
    """Node metadata'dan credential input'ları detect et"""
    
    def __init__(self):
        # Primary detection: is_secret flag
        self.secret_flag_detection = True
        
        # Secondary detection: naming patterns
        self.credential_name_patterns = {
            'api_key', 'token', 'secret', 'password', 'key',
            'auth', 'credential', 'access_key', 'private_key',
            'connection_string', 'database_url', 'dsn'
        }
        
        # Tertiary detection: type patterns
        self.credential_type_patterns = {
            'password', 'secret', 'token'
        }
        
        # Provider-specific patterns
        self.provider_patterns = {
            'openai': ['api_key', 'organization'],
            'cohere': ['api_key', 'token'],
            'anthropic': ['api_key', 'x_api_key'],
            'tavily': ['api_key'],
            'langsmith': ['api_key', 'project'],
            'database': ['connection_string', 'database_url', 'dsn', 'password']
        }
        
        # Security levels
        self.security_levels = {
            'critical': ['private_key', 'secret_key', 'master_key'],
            'high': ['api_key', 'token', 'password'],
            'medium': ['connection_string', 'database_url'],
            'low': ['username', 'endpoint']
        }
    
    def is_credential_input(self, input_spec: NodeInput) -> bool:
        """Input'un credential olup olmadığını kontrol et"""
        
        # 1. Primary check: is_secret flag
        if getattr(input_spec, 'is_secret', False):
            return True
        
        input_name_lower = input_spec.name.lower()
        input_type_lower = input_spec.type.lower()
        
        # 2. Explicit non-credential patterns (BufferMemory config keys)
        non_credential_patterns = {
            'memory_key', 'input_key', 'output_key', 'return_messages',
            'model_name', 'temperature', 'max_tokens', 'top_p',
            'collection_name', 'search_k', 'max_iterations'
        }
        
        if input_name_lower in non_credential_patterns:
            return False
        
        # 3. Secondary check: name patterns
        for pattern in self.credential_name_patterns:
            if pattern in input_name_lower:
                return True
        
        # 4. Tertiary check: type patterns
        if input_type_lower in self.credential_type_patterns:
            return True
        
        return False
    
    def get_security_level(self, input_spec: NodeInput) -> str:
        """Input'un security level'ini belirle"""
        
        input_name_lower = input_spec.name.lower()
        
        for level, patterns in self.security_levels.items():
            if any(pattern in input_name_lower for pattern in patterns):
                return level
        
        # Default to high for any detected credential
        return "high"


class EnvVarNameGenerator:
    """Node type ve input name'den environment variable name oluştur"""
    
    def __init__(self):
        # Node type normalization mappings
        self.node_type_mappings = {
            'OpenAIChat': 'OPENAI',
            'OpenAINode': 'OPENAI',
            'OpenAIEmbeddingsProvider': 'OPENAI',
            'OpenAIEmbeddings': 'OPENAI',
            'CohereRerankerNode': 'COHERE',
            'CohereRerankerProvider': 'COHERE',
            'VectorStoreOrchestrator': 'VECTORSTORE',
            'TavilyWebSearch': 'TAVILY',
            'TavilyWebSearchNode': 'TAVILY',
            'TavilySearch': 'TAVILY',
            'RetrieverProvider': 'RETRIEVER',
            'BufferMemory': 'BUFFER_MEMORY'
        }
        
        # Input name normalization
        self.input_name_mappings = {
            'api_key': 'API_KEY',
            'cohere_api_key': 'API_KEY',
            'openai_api_key': 'API_KEY',
            'tavily_api_key': 'API_KEY',
            'connection_string': 'CONNECTION_STRING',
            'database_url': 'DATABASE_URL'
        }
    
    def generate_env_var_name(self, node_type: str, input_name: str) -> str:
        """Standard environment variable name oluştur"""
        
        # Node type'ı normalize et
        normalized_node_type = self.node_type_mappings.get(
            node_type,
            self._normalize_node_type(node_type)
        )
        
        # Input name'i normalize et
        normalized_input_name = self.input_name_mappings.get(
            input_name,
            self._normalize_input_name(input_name)
        )
        
        # Combine with underscore
        env_var_name = f"{normalized_node_type}_{normalized_input_name}"
        
        return env_var_name
    
    def _normalize_node_type(self, node_type: str) -> str:
        """Node type'ı env var prefix'e çevir"""
        # CamelCase'den UPPER_CASE'e çevir
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', node_type)
        result = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).upper()
        
        # Common abbreviations
        result = result.replace('_NODE', '').replace('_PROVIDER', '')
        
        return result
    
    def _normalize_input_name(self, input_name: str) -> str:
        """Input name'i env var suffix'e çevir"""
        return input_name.upper().replace('-', '_')


class PackageAnalyzer:
    """Node tiplerinden package dependencies çıkar"""
    
    def __init__(self):
        # Category-based package mapping
        self.category_packages = {
            "LLM": ["langchain-openai>=0.0.5", "openai>=1.0.0", "langchain>=0.1.0"],
            "Tool": ["langchain-community>=0.0.10", "requests>=2.31.0"],
            "Agent": ["langgraph>=0.0.30", "langchain>=0.1.0"],
            "VectorStore": ["langchain-postgres>=0.0.15", "pgvector>=0.2.0", "psycopg2-binary>=2.9.0"],
            "Memory": ["langchain>=0.1.0", "langchain-core>=0.1.0"],
            "DocumentLoader": ["langchain-community>=0.0.10", "beautifulsoup4>=4.12.0"],
            "TextSplitter": ["langchain-text-splitters>=0.3.0"],
            "Embedding": ["langchain-core>=0.1.0"]
        }
        
        # Node-specific package mapping
        self.node_packages = {
            "OpenAIChat": ["langchain-openai>=0.0.5", "openai>=1.0.0"],
            "OpenAINode": ["langchain-openai>=0.0.5", "openai>=1.0.0"],
            "TavilyWebSearch": ["langchain-tavily>=0.2.0", "tavily-python>=0.3.0"],
            "TavilyWebSearchNode": ["langchain-tavily>=0.2.0", "tavily-python>=0.3.0"],
            "CohereRerankerProvider": ["langchain-cohere>=0.4.0", "cohere==5.12.0"],
            "CohereRerankerNode": ["langchain-cohere>=0.4.0", "cohere==5.12.0"],
            "VectorStoreOrchestrator": ["langchain-postgres>=0.0.15", "pgvector>=0.2.0"],
            "ReactAgent": ["langgraph>=0.0.30", "langchain>=0.1.0"],
            "ReactAgentNode": ["langgraph>=0.0.30", "langchain>=0.1.0"]
        }
        
        # Base packages için her workflow
        self.base_packages = [
            "fastapi>=0.104.0",
            "uvicorn[standard]>=0.24.0",
            "pydantic>=2.5.0",
            "pydantic-settings>=2.1.0",
            "sqlalchemy>=2.0.0",
            "python-dotenv>=1.0.0",
            "langchain-core>=0.1.0"
        ]
    
    def analyze_packages(self, node_types: List[str]) -> List[PackageDependency]:
        """Node tiplerinden package dependencies çıkar"""
        
        all_packages = set(self.base_packages)
        package_dependencies = []
        
        # Base packages'ları ekle
        for package in self.base_packages:
            name, version = self._parse_package_spec(package)
            package_dependencies.append(PackageDependency(
                name=name,
                version=version,
                category="Base",
                source_node="System",
                required=True
            ))
        
        # Node-specific packages
        for node_type in node_types:
            # Direct node mapping
            if node_type in self.node_packages:
                node_packages = self.node_packages[node_type]
                for package in node_packages:
                    if package not in all_packages:
                        all_packages.add(package)
                        name, version = self._parse_package_spec(package)
                        package_dependencies.append(PackageDependency(
                            name=name,
                            version=version,
                            category="Node-Specific",
                            source_node=node_type,
                            required=True
                        ))
            
            # Category-based packages
            try:
                node_class = node_registry.get_node(node_type)
                if node_class:
                    metadata = node_class().metadata
                    category = metadata.category
                    
                    if category in self.category_packages:
                        category_packages = self.category_packages[category]
                        for package in category_packages:
                            if package not in all_packages:
                                all_packages.add(package)
                                name, version = self._parse_package_spec(package)
                                package_dependencies.append(PackageDependency(
                                    name=name,
                                    version=version,
                                    category=f"Category-{category}",
                                    source_node=node_type,
                                    required=True
                                ))
            except Exception as e:
                logger.warning(f"Could not analyze packages for {node_type}: {e}")
        
        return package_dependencies
    
    def _parse_package_spec(self, package_spec: str) -> Tuple[str, str]:
        """Package specification'ı parse et"""
        if ">=" in package_spec:
            name, version = package_spec.split(">=")
            return name, f">={version}"
        elif "==" in package_spec:
            name, version = package_spec.split("==")
            return name, f"=={version}"
        else:
            return package_spec, ""


class DynamicNodeAnalyzer:
    """Node registry'den otomatik workflow analysis ve dependency detection"""
    
    def __init__(self, node_registry: NodeRegistry):
        self.node_registry = node_registry
        self.credential_detector = CredentialDetector()
        self.name_generator = EnvVarNameGenerator()
        self.package_analyzer = PackageAnalyzer()
    
    def analyze_workflow(self, flow_data: Dict[str, Any]) -> WorkflowAnalysisResult:
        """Workflow'dan complete analysis çıkar"""
        
        logger.info("🔍 Starting dynamic workflow analysis")
        
        # 1. Node tiplerini çıkar
        node_types = self._extract_node_types(flow_data)
        logger.info(f"Found {len(node_types)} node types: {node_types}")
        
        # 2. Environment variables analiz et
        environment_variables = self._analyze_environment_variables(node_types, flow_data)
        logger.info(f"Detected {len(environment_variables)} environment variables")
        
        # 3. Package dependencies analiz et
        package_dependencies = self.package_analyzer.analyze_packages(node_types)
        logger.info(f"Detected {len(package_dependencies)} package dependencies")
        
        # 4. Security requirements
        security_requirements = self._analyze_security_requirements(environment_variables)
        
        # 5. Complexity score
        complexity_score = self._calculate_complexity_score(node_types, environment_variables)
        
        result = WorkflowAnalysisResult(
            node_types=node_types,
            environment_variables=environment_variables,
            package_dependencies=package_dependencies,
            security_requirements=security_requirements,
            complexity_score=complexity_score,
            analysis_timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"✅ Dynamic analysis complete: {len(node_types)} nodes, "
                   f"{len(environment_variables)} env vars, "
                   f"complexity score: {complexity_score}")
        
        return result
    
    def _extract_node_types(self, flow_data: Dict[str, Any]) -> List[str]:
        """Workflow data'dan node tiplerini çıkar"""
        
        node_types = []
        nodes = flow_data.get("nodes", [])
        
        for node in nodes:
            node_type = node.get("type", "")
            if node_type and node_type not in node_types:
                node_types.append(node_type)
        
        return node_types
    
    def _analyze_environment_variables(self, node_types: List[str], 
                                      flow_data: Dict[str, Any]) -> List[EnvironmentVariable]:
        """Node tiplerinden environment variable'ları analiz et"""
        
        environment_variables = []
        seen_env_vars = set()
        
        for node_type in node_types:
            try:
                node_class = self.node_registry.get_node(node_type)
                if not node_class:
                    logger.warning(f"Node class not found in registry: {node_type}")
                    continue
                
                # Node metadata al
                metadata = node_class().metadata
                
                # Her input için environment variable oluştur
                for input_spec in metadata.inputs:
                    # Connection input'ları skip et
                    if input_spec.is_connection:
                        continue
                    
                    # Environment variable name oluştur
                    env_var_name = self.name_generator.generate_env_var_name(
                        node_type, input_spec.name
                    )
                    
                    # Duplicate check
                    if env_var_name in seen_env_vars:
                        continue
                    seen_env_vars.add(env_var_name)
                    
                    # Credential mi kontrol et
                    is_credential = self.credential_detector.is_credential_input(input_spec)
                    security_level = self.credential_detector.get_security_level(input_spec) if is_credential else "low"
                    
                    # Example value oluştur
                    example_value = self._generate_example_value(input_spec, node_type)
                    
                    env_var = EnvironmentVariable(
                        name=env_var_name,
                        description=f"{input_spec.description} (Node: {node_type})",
                        example=example_value,
                        default=getattr(input_spec, 'default', None),
                        required=self._determine_if_required(input_spec, is_credential),
                        node_type=node_type,
                        input_name=input_spec.name,
                        is_credential=is_credential,
                        data_type=input_spec.type,
                        security_level=security_level
                    )
                    
                    environment_variables.append(env_var)
                    
            except Exception as e:
                logger.warning(f"Could not analyze environment variables for {node_type}: {e}")
        
        # Always add DATABASE_URL for workflow execution data
        if "DATABASE_URL" not in seen_env_vars:
            environment_variables.append(EnvironmentVariable(
                name="DATABASE_URL",
                description="Database connection URL for storing workflow execution data",
                example="postgresql://user:password@localhost:5432/workflow_db",
                required=True,
                node_type="System",
                input_name="database_url",
                is_credential=True,
                data_type="str",
                security_level="medium"
            ))
        
        return environment_variables
    
    def _determine_if_required(self, input_spec: NodeInput, is_credential: bool) -> bool:
        """
        Determine if an environment variable should be required or optional
        
        Logic:
        - Credentials without default values: Required
        - Credentials with default values: Optional (fallback available)
        - Configuration with default values: Optional
        - Configuration without default values: Required (needed for functionality)
        - Special cases: API keys are generally required even with defaults
        """
        has_default = hasattr(input_spec, 'default') and input_spec.default is not None
        input_name_lower = input_spec.name.lower()
        
        # Critical credentials are always required (API keys, connection strings)
        critical_credential_patterns = ['api_key', 'connection_string', 'database_url', 'token']
        if is_credential and any(pattern in input_name_lower for pattern in critical_credential_patterns):
            return True
        
        # Configuration parameters with defaults are optional
        if has_default:
            return False
        
        # Everything else follows the original required flag
        return input_spec.required
    
    def _generate_example_value(self, input_spec: NodeInput, node_type: str) -> str:
        """Input spec'e göre example value oluştur"""
        
        input_name_lower = input_spec.name.lower()
        input_type = input_spec.type.lower()
        node_type_lower = node_type.lower()
        
        # Credential examples
        if 'openai' in node_type_lower and 'api_key' in input_name_lower:
            return "sk-1234567890abcdef..."
        elif 'cohere' in node_type_lower and 'api_key' in input_name_lower:
            return "cohere-key-1234..."
        elif 'tavily' in node_type_lower and 'api_key' in input_name_lower:
            return "tvly-1234567890abcdef..."
        elif 'connection' in input_name_lower or 'database' in input_name_lower:
            return "postgresql://user:pass@localhost:5432/dbname"
        elif 'api_key' in input_name_lower:
            return "your-api-key-here"
        
        # Configuration examples by type
        elif input_type == 'str' and 'model' in input_name_lower:
            return "gpt-4o-mini"
        elif input_type == 'float' and 'temperature' in input_name_lower:
            return "0.7"
        elif input_type == 'int' and 'token' in input_name_lower:
            return "2048"
        elif input_type == 'bool':
            return "true"
        elif input_type == 'int':
            return "10"
        elif input_type == 'float':
            return "0.5"
        else:
            return "your-value-here"
    
    def _analyze_security_requirements(self, environment_variables: List[EnvironmentVariable]) -> Dict[str, Any]:
        """Security requirements analiz et"""
        
        security_levels = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        credential_count = 0
        
        for env_var in environment_variables:
            security_levels[env_var.security_level] += 1
            if env_var.is_credential:
                credential_count += 1
        
        return {
            "total_credentials": credential_count,
            "security_levels": security_levels,
            "requires_secure_storage": security_levels["critical"] > 0 or security_levels["high"] > 0,
            "audit_logging_required": credential_count > 0
        }
    
    def _calculate_complexity_score(self, node_types: List[str], 
                                   environment_variables: List[EnvironmentVariable]) -> float:
        """Workflow complexity score hesapla"""
        
        # Base score
        score = len(node_types) * 1.0
        
        # Credential complexity
        credential_count = sum(1 for env_var in environment_variables if env_var.is_credential)
        score += credential_count * 0.5
        
        # Node type complexity weights
        complexity_weights = {
            "llm": 2.0,
            "agent": 3.0,
            "vectorstore": 2.5,
            "tool": 1.5,
            "memory": 1.0
        }
        
        try:
            for node_type in node_types:
                node_class = self.node_registry.get_node(node_type)
                if node_class:
                    metadata = node_class().metadata
                    category = metadata.category.lower()
                    weight = complexity_weights.get(category, 1.0)
                    score += weight
        except Exception:
            pass  # Ignore errors in complexity calculation
        
        return round(score, 2)


# Global instance
dynamic_analyzer = DynamicNodeAnalyzer(node_registry)