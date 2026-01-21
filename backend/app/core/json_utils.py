"""
JSON Serialization Utilities - Best Practice Implementation
===========================================================

This module provides efficient JSON serialization utilities using orjson,
which is significantly faster than the standard library's json module and
includes built-in support for common non-serializable types.

Features:
• Fast serialization using orjson
• Automatic handling of datetime, UUID, date, Decimal
• Pydantic model support
• LangChain object support (BaseTool, Runnable, etc.)
• Agent result filtering (tools, memory, intermediate_steps)
• Fallback to standard json for unsupported types
• Recursive handling of nested structures

Best Practices:
• Use orjson.dumps() for fast serialization (3-5x faster than json)
• Use make_json_serializable() for complex objects before serialization
• Use make_json_serializable_with_langchain() for LangChain objects
• Prefer pydantic models for structured data with automatic validation

Usage:
    from app.core.json_utils import make_json_serializable, safe_json_dumps
    
    # Option 1: Convert then serialize
    serializable = make_json_serializable(data)
    json_str = json.dumps(serializable)
    
    # Option 2: Direct serialization (recommended)
    json_str = safe_json_dumps(data)
    
    # Option 3: Fast serialization with orjson (best performance)
    json_bytes = orjson.dumps(data, default=json_serializer_default)
    
    # Option 4: LangChain-aware serialization
    serializable = make_json_serializable_with_langchain(agent_result, filter_complex=True)
"""

from typing import Any, Optional
from datetime import datetime, date
from decimal import Decimal
import uuid
import json

try:
    import orjson
    ORJSON_AVAILABLE = True
except ImportError:
    ORJSON_AVAILABLE = False

# Lazy import for LangChain types (optional dependency)
_LANGCHAIN_AVAILABLE = False
_BaseTool = None
_Runnable = None

try:
    from langchain_core.tools import BaseTool
    from langchain_core.runnables import Runnable
    _LANGCHAIN_AVAILABLE = True
    _BaseTool = BaseTool
    _Runnable = Runnable
except ImportError:
    pass


def json_serializer_default(obj: Any) -> Any:
    """
    Default serializer function for orjson that handles common non-serializable types.
    
    This function is used as the 'default' parameter for orjson.dumps() and
    handles datetime, UUID, date, Decimal, LangChain objects, and other common types.
    
    Args:
        obj: Object to serialize
        
    Returns:
        JSON-serializable representation of the object
        
    Examples:
        >>> import orjson
        >>> from app.core.json_utils import json_serializer_default
        >>> data = {"created_at": datetime.now(), "id": uuid.uuid4()}
        >>> orjson.dumps(data, default=json_serializer_default)
        b'{"created_at":"2025-01-13T12:00:00","id":"..."}'
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    elif isinstance(obj, Decimal):
        return float(obj)
    # LangChain objects (if available)
    elif _LANGCHAIN_AVAILABLE and (_BaseTool and isinstance(obj, _BaseTool) or 
                                   _Runnable and isinstance(obj, _Runnable)):
        return f"<{obj.__class__.__name__}>"
    elif _LANGCHAIN_AVAILABLE and callable(obj):
        return f"<{obj.__class__.__name__}>"
    # Pydantic v2 models
    elif hasattr(obj, 'model_dump'):
        try:
            return obj.model_dump()
        except Exception:
            pass
    # Pydantic v1 models (legacy)
    elif hasattr(obj, 'dict'):
        try:
            return obj.dict()
        except Exception:
            pass
    # Objects with __dict__ attribute
    elif hasattr(obj, '__dict__'):
        return obj.__dict__
    # Raise TypeError to let orjson handle it with default fallback
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _contains_langchain_complex_objects(obj: Any) -> bool:
    """
    Check if object contains complex LangChain objects that can't be serialized.
    
    Args:
        obj: Object to check
        
    Returns:
        True if object contains complex LangChain objects
    """
    if not isinstance(obj, dict):
        return False
    complex_keys = ['tools', 'tool_names', 'intermediate_steps', 'memory']
    return any(key in obj for key in complex_keys)


def make_json_serializable(obj: Any, filter_langchain_complex: bool = False) -> Any:
    """
    Recursively convert non-JSON-serializable objects to serializable format.
    
    This is a comprehensive utility that handles:
    - datetime, date objects → ISO format strings
    - UUID objects → string representation
    - Decimal → float
    - Pydantic models → dictionaries via model_dump()
    - LangChain objects (BaseTool, Runnable) → string representation
    - Custom objects → dictionaries via __dict__
    - Nested structures (dict, list, tuple)
    
    Args:
        obj: Object to make JSON-serializable (can be any type)
        filter_langchain_complex: If True, filters out complex LangChain objects
                                 (tools, intermediate_steps, memory) from dicts
        
    Returns:
        JSON-serializable version of the object
        
    Examples:
        >>> from datetime import datetime
        >>> import uuid
        >>> data = {
        ...     "timestamp": datetime.now(),
        ...     "id": uuid.uuid4(),
        ...     "nested": {"value": datetime.now()}
        ... }
        >>> serializable = make_json_serializable(data)
        >>> json.dumps(serializable)  # Works without errors
    """
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        # Filter complex LangChain objects if requested
        if filter_langchain_complex and _contains_langchain_complex_objects(obj):
            return _filter_langchain_complex_objects(obj, filter_langchain_complex)
        return {key: make_json_serializable(value, filter_langchain_complex) 
                for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(item, filter_langchain_complex) 
                for item in obj]
    # LangChain objects (if available)
    elif _LANGCHAIN_AVAILABLE:
        if (_BaseTool and isinstance(obj, _BaseTool)) or \
           (_Runnable and isinstance(obj, _Runnable)) or \
           callable(obj):
            return f"<{obj.__class__.__name__}>"
    # Pydantic v2 models
    elif hasattr(obj, 'model_dump'):
        try:
            return make_json_serializable(obj.model_dump(), filter_langchain_complex)
        except Exception:
            return str(obj)
    # Pydantic v1 models (legacy)
    elif hasattr(obj, 'dict'):
        try:
            return make_json_serializable(obj.dict(), filter_langchain_complex)
        except Exception:
            return str(obj)
    # Objects with __dict__ attribute
    elif hasattr(obj, '__dict__'):
        return make_json_serializable(obj.__dict__, filter_langchain_complex)
    else:
        # Try to check if it's already JSON serializable
        try:
            json.dumps(obj)
            return obj
        except (TypeError, ValueError):
            return str(obj)


def _filter_langchain_complex_objects(obj: Any, filter_complex: bool = True) -> Any:
    """
    Filter out complex LangChain objects from Agent results, keeping only serializable data.
    
    This function specifically handles LangChain agent results by:
    - Removing 'tools' and 'intermediate_steps' completely
    - Converting 'tool_names' to list of strings
    - Extracting messages from 'memory' if available
    - Recursively processing other values
    
    Args:
        obj: Object to filter (should be dict containing LangChain complex objects)
        filter_complex: If True, filters complex objects (used for nested calls)
        
    Returns:
        Filtered object with only serializable data
    """
    if not isinstance(obj, dict):
        # For non-dict objects, just make serializable without filtering
        return make_json_serializable(obj, filter_langchain_complex=False)
    
    filtered = {}
    for key, value in obj.items():
        if key in ['tools', 'intermediate_steps']:
            # Skip these complex objects completely
            continue
        elif key == 'tool_names':
            # Convert tool names to list of strings
            if isinstance(value, list):
                filtered[key] = [str(name) for name in value]
            else:
                filtered[key] = str(value)
        elif key == 'memory':
            # Extract messages from memory if available
            if hasattr(value, 'chat_memory') and hasattr(value.chat_memory, 'messages'):
                filtered[key] = [
                    msg.content if hasattr(msg, 'content') else str(msg)
                    for msg in value.chat_memory.messages
                ]
            else:
                filtered[key] = str(value)
        else:
            # Recursively process other values without filtering again
            # (already filtered at top level, just serialize nested values)
            filtered[key] = make_json_serializable(value, filter_langchain_complex=False)
    
    return filtered


def make_json_serializable_with_langchain(obj: Any, filter_complex: bool = True) -> Any:
    """
    Make object JSON-serializable with LangChain-specific handling.
    
    This is a convenience wrapper around make_json_serializable() that automatically
    enables LangChain complex object filtering. Use this when working with LangChain
    agent results or other LangChain objects.
    
    Args:
        obj: Object to make JSON-serializable
        filter_complex: If True, filters out complex LangChain objects (tools, memory, etc.)
        
    Returns:
        JSON-serializable version of the object
        
    Examples:
        >>> agent_result = {"output": "Hello", "tools": [...], "memory": ...}
        >>> serializable = make_json_serializable_with_langchain(agent_result)
        >>> # tools and memory are filtered out, output is preserved
    """
    return make_json_serializable(obj, filter_langchain_complex=filter_complex)


def safe_json_dumps(obj: Any, **kwargs) -> str:
    """
    Safely serialize object to JSON string with automatic type handling.
    
    Uses orjson if available for better performance, otherwise falls back
    to standard json with make_json_serializable preprocessing.
    
    Args:
        obj: Object to serialize
        **kwargs: Additional arguments for json.dumps() or orjson.dumps()
        
    Returns:
        JSON string representation
        
    Examples:
        >>> from datetime import datetime
        >>> data = {"timestamp": datetime.now()}
        >>> json_str = safe_json_dumps(data)
        >>> print(json_str)
        '{"timestamp":"2025-01-13T12:00:00"}'
    """
    if ORJSON_AVAILABLE:
        try:
            # orjson returns bytes, decode to string
            result = orjson.dumps(obj, default=json_serializer_default, **kwargs)
            return result.decode('utf-8')
        except (TypeError, ValueError):
            # Fallback to recursive conversion if orjson fails
            serializable = make_json_serializable(obj)
            return orjson.dumps(serializable).decode('utf-8')
    else:
        # Fallback to standard json with preprocessing
        serializable = make_json_serializable(obj)
        return json.dumps(serializable, **kwargs)


def safe_json_loads(s: str | bytes, **kwargs) -> Any:
    """
    Safely deserialize JSON string/bytes to Python object.
    
    Uses orjson if available for better performance, otherwise falls back
    to standard json.loads().
    
    Args:
        s: JSON string or bytes to deserialize
        **kwargs: Additional arguments for json.loads() or orjson.loads()
        
    Returns:
        Deserialized Python object
    """
    if ORJSON_AVAILABLE:
        if isinstance(s, str):
            s = s.encode('utf-8')
        return orjson.loads(s, **kwargs)
    else:
        if isinstance(s, bytes):
            s = s.decode('utf-8')
        return json.loads(s, **kwargs)

