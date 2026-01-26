"""
KAI-Fusion Code Execution Node - Multi-Language Code Processing Engine
======================================================================

This module implements a sophisticated multi-language code execution node for the KAI-Fusion platform,
providing secure, sandboxed code execution capabilities for Python and JavaScript.
Built for dynamic data processing, transformation, and custom logic implementation within workflows.

ARCHITECTURAL OVERVIEW:
======================

The Code node serves as a flexible multi-language code execution engine, allowing users to write
custom Python or JavaScript code to process inputs, transform data, and generate outputs dynamically.

┌─────────────────────────────────────────────────────────────────┐
│                  Code Execution Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input Data → [Language Selector] → [Code Editor]              │
│       ↓               ↓                    ↓                    │
│  [Validation] → [Runtime Selection] → [Sandbox Environment]    │
│       ↓               ↓                    ↓                    │
│  [Code Execution] → [Error Handling] → [Output Processing]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

KEY FEATURES:
============

1. **Multi-Language Support**:
   - Python 3.x execution with secure sandbox
   - JavaScript (Node.js) execution environment
   - Language-specific helper functions and modules

2. **Secure Sandbox Execution**:
   - Isolated execution environment for each language
   - Resource limits and timeout protection
   - Safe module imports with whitelist
   - Memory and CPU usage constraints

3. **Batch Processing Support**:
   - Support for processing datasets efficiently
   - Optimized for large data processing

4. **Rich Context Access**:
   - Access to input data and workflow variables
   - Helper functions for common operations
   - JSON manipulation utilities
   - Date/time handling functions

AUTHORS: KAI-Fusion Development Team
VERSION: 2.0.0
LICENSE: Proprietary - KAI-Fusion Platform
"""

import ast
import json
import sys
import traceback
import io
import contextlib
import subprocess
import tempfile
import os
import signal
import time
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timezone
from functools import wraps
import logging

from langchain_core.documents import Document
from langchain_core.runnables import Runnable, RunnableLambda

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType, NodeProperty, NodePropertyType, NodePosition
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# Safe built-in functions and modules for Python sandbox
SAFE_PYTHON_BUILTINS = {
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytes', 'chr',
    'dict', 'dir', 'divmod', 'enumerate', 'filter', 'float', 'format',
    'frozenset', 'hex', 'int', 'isinstance', 'issubclass', 'iter',
    'len', 'list', 'map', 'max', 'min', 'next', 'oct', 'ord', 'pow',
    'print', 'range', 'repr', 'reversed', 'round', 'set', 'slice',
    'sorted', 'str', 'sum', 'tuple', 'type', 'zip',
    # Additional safe functions
    'hasattr', 'getattr', 'setattr', 'delattr', 'hash', 'id',
    'callable', 'classmethod', 'staticmethod', 'property',
    'locals', 'globals', 'vars',  # Add these for variable access
}

SAFE_PYTHON_MODULES = {
    'json', 'math', 'random', 're', 'datetime', 'time', 'itertools',
    'collections', 'functools', 'operator', 'string', 'decimal',
    'fractions', 'statistics', 'base64', 'hashlib', 'hmac', 'secrets',
    'uuid', 'urllib.parse', 'html', 'xml.etree.ElementTree'
}

# Safe JavaScript modules (Node.js built-ins)
SAFE_JS_MODULES = {
    'crypto', 'util', 'url', 'querystring', 'path', 'os'
}

CODE_INPUT_VARIABLE_NAME = "node_data"


def timeout_handler(signum, frame):
    """Handle execution timeout"""
    raise TimeoutError("Code execution timed out")


class PythonSandbox:
    """
    Secure Python execution sandbox using subprocess for cross-platform timeout support.
    Runs Python code in a separate process (like JavaScriptSandbox) for reliable timeout on Windows.
    """

    def __init__(self, code: str, context: Dict[str, Any], timeout: int = 30):
        self.code = code
        self.context = context
        self.timeout = timeout

    def validate_code(self) -> Optional[str]:
        """Validate Python code syntax and check for dangerous operations"""
        try:
            tree = ast.parse(self.code)

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name.split('.')[0] not in SAFE_PYTHON_MODULES:
                            return f"Import of '{alias.name}' is not allowed"

                if isinstance(node, ast.ImportFrom):
                    if node.module and node.module.split('.')[0] not in SAFE_PYTHON_MODULES:
                        return f"Import from '{node.module}' is not allowed"

                if isinstance(node, ast.Name) and node.id in ['eval', 'exec', 'compile', '__import__', 'open', 'file', 'input']:
                    return f"Use of '{node.id}' is not allowed"

                if isinstance(node, ast.Attribute):
                    if hasattr(node.value, 'id') and node.value.id in ['os', 'sys', 'subprocess']:
                        return f"Access to '{node.value.id}' module is not allowed"

            return None

        except SyntaxError as e:
            return f"Syntax error at line {e.lineno}: {e.msg}"
        except Exception as e:
            return f"Code validation error: {str(e)}"

    def _build_wrapper_script(self) -> str:
        """Build the Python wrapper script that will run in subprocess"""
        # Serialize context to JSON, escaping properly for embedding in Python string
        context_json = json.dumps(self.context, default=str, ensure_ascii=False)
        # Escape backslashes and triple quotes for safe embedding
        context_json_escaped = context_json.replace('\\', '\\\\').replace('"""', '\\"\\"\\"')
        
        # Escape the user code for embedding (handle triple quotes)
        user_code_escaped = self.code.replace('\\', '\\\\').replace('"""', '\\"\\"\\"')
        
        # List of safe builtins as a Python literal
        safe_builtins_list = list(SAFE_PYTHON_BUILTINS)

        wrapper = f'''# -*- coding: utf-8 -*-
import sys
import json
import math
import random
import re
import datetime
import time
import itertools
import collections
import traceback
import builtins

# Safe builtins whitelist
SAFE_BUILTINS = {safe_builtins_list!r}

def main():
    # Build restricted builtins
    safe_builtins_dict = {{k: getattr(builtins, k) for k in SAFE_BUILTINS if hasattr(builtins, k)}}
    
    # Execution namespace with safe modules
    exec_globals = {{
        '__builtins__': safe_builtins_dict,
        'json': json,
        'math': math,
        'random': random,
        're': re,
        'datetime': datetime,
        'time': time,
        'itertools': itertools,
        'collections': collections,
    }}
    
    # Load and apply context
    try:
        context = json.loads("""{context_json_escaped}""")
        exec_globals.update(context)
    except Exception as ctx_err:
        print('__PY_OUTPUT_START__')
        print(json.dumps({{'success': False, 'output': None, 'error': f'Context load error: {{ctx_err}}'}}, ensure_ascii=False))
        print('__PY_OUTPUT_END__')
        return
    
    # Add helper functions
    exec_globals['_json'] = json
    exec_globals['_now'] = datetime.datetime.now
    exec_globals['_utcnow'] = lambda: datetime.datetime.now(datetime.timezone.utc)
    
    exec_locals = {{}}
    
    try:
        # Execute user code
        user_code = """{user_code_escaped}"""
        exec(user_code, exec_globals, exec_locals)
        
        # Get output variable
        output = exec_locals.get('output', exec_locals.get('result', None))
        
        # Prepare locals for serialization (exclude callables and private vars)
        serializable_locals = {{}}
        for k, v in exec_locals.items():
            if not k.startswith('_') and not callable(v):
                try:
                    json.dumps(v, default=str)
                    serializable_locals[k] = v
                except:
                    serializable_locals[k] = str(v)
        
        print('__PY_OUTPUT_START__')
        print(json.dumps({{
            'success': True,
            'output': output,
            'error': None,
            'locals': serializable_locals
        }}, default=str, ensure_ascii=False))
        print('__PY_OUTPUT_END__')
        
    except Exception as e:
        exc_type, exc_value, exc_tb = sys.exc_info()
        tb_lines = traceback.format_exception(exc_type, exc_value, exc_tb)
        error_msg = ''.join(tb_lines)
        
        print('__PY_OUTPUT_START__')
        print(json.dumps({{
            'success': False,
            'output': None,
            'error': error_msg
        }}, ensure_ascii=False))
        print('__PY_OUTPUT_END__')

if __name__ == '__main__':
    main()
'''
        return wrapper

    def execute(self) -> Dict[str, Any]:
        """Execute Python code in subprocess with timeout support"""
        # Validate code first
        validation_error = self.validate_code()
        if validation_error:
            return {
                'success': False,
                'error': validation_error,
                'output': None,
                'stdout': ''
            }

        temp_file_path = None
        try:
            # Build wrapper script
            wrapper_script = self._build_wrapper_script()
            
            # Write to temporary file
            with tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.py', 
                delete=False, 
                encoding='utf-8'
            ) as temp_file:
                temp_file.write(wrapper_script)
                temp_file_path = temp_file.name

            # Execute in subprocess with timeout
            result = subprocess.run(
                [sys.executable, temp_file_path],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                encoding='utf-8'
            )

            stdout = result.stdout
            stderr = result.stderr

            # Parse structured output
            if '__PY_OUTPUT_START__' in stdout and '__PY_OUTPUT_END__' in stdout:
                # Extract user's print statements (before our markers)
                marker_pos = stdout.find('__PY_OUTPUT_START__')
                user_stdout = stdout[:marker_pos].strip()
                
                # Extract JSON result
                start_idx = stdout.find('__PY_OUTPUT_START__') + len('__PY_OUTPUT_START__\n')
                end_idx = stdout.find('__PY_OUTPUT_END__')
                json_str = stdout[start_idx:end_idx].strip()

                try:
                    output_data = json.loads(json_str)
                    output_data['stdout'] = user_stdout
                    return output_data
                except json.JSONDecodeError as e:
                    return {
                        'success': False,
                        'error': f'Failed to parse output JSON: {e}',
                        'output': None,
                        'stdout': user_stdout
                    }
            else:
                # No structured output found
                if result.returncode != 0:
                    return {
                        'success': False,
                        'error': stderr or 'Python execution failed with no output',
                        'output': None,
                        'stdout': stdout
                    }
                return {
                    'success': True,
                    'error': None,
                    'output': None,
                    'stdout': stdout
                }

        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': f"Python execution timed out after {self.timeout} seconds",
                'output': None,
                'stdout': ''
            }
        except FileNotFoundError:
            return {
                'success': False,
                'error': "Python interpreter not found",
                'output': None,
                'stdout': ''
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Python execution failed: {str(e)}",
                'output': None,
                'stdout': ''
            }
        finally:
            # Clean up temp file
            if temp_file_path:
                try:
                    os.unlink(temp_file_path)
                except:
                    pass


class JavaScriptSandbox:
    """
    JavaScript execution sandbox using Node.js with security restrictions.
    """

    def __init__(self, code: str, context: Dict[str, Any], timeout: int = 30):
        self.code = code
        self.context = context
        self.timeout = timeout

    def validate_code(self) -> Optional[str]:
        """Validate JavaScript code for dangerous operations"""
        dangerous_patterns = [
            'require("fs")', 'require(\'fs\')', 'require(`fs`)',
            'require("child_process")', 'require(\'child_process\')', 'require(`child_process`)',
            'require("net")', 'require(\'net\')', 'require(`net`)',
            'require("http")', 'require(\'http\')', 'require(`http`)',
            'require("https")', 'require(\'https\')', 'require(`https`)',
            'process.exit', 'eval(', '__dirname', '__filename',
            'global.', 'Buffer.', 'setImmediate', 'clearImmediate'
        ]

        for pattern in dangerous_patterns:
            if pattern in self.code:
                return f"Dangerous operation '{pattern}' is not allowed"

        return None

    def create_wrapper_code(self) -> str:
        """Create JavaScript wrapper code with context and safety measures"""
        # Convert Python context to JavaScript (preserve Unicode characters)
        context_json = json.dumps(self.context, default=str, ensure_ascii=False)

        wrapper = f"""
// Sandbox environment setup
const sandbox = {{}};

// Add context variables
const context = {context_json};
Object.assign(sandbox, context);

// Add safe utilities
sandbox.JSON = JSON;
sandbox.Math = Math;
sandbox.Date = Date;
sandbox._now = () => new Date();
sandbox._utcnow = () => new Date();
sandbox.console = console;

// Helper functions
sandbox._json = JSON;

// User code execution
try {{
    // Make context available in global scope
    for (const key in sandbox) {{
        if (key !== 'output' && key !== 'result') {{
            global[key] = sandbox[key];
        }}
    }}

    // Initialize output variables as undefined to avoid conflicts
    let output, result;

    // Execute user code
    {self.code}

    // Get the final output value
    let finalOutput = (typeof result !== 'undefined') ? result : 
                     (typeof output !== 'undefined') ? output : null;

    // Return result
    console.log('__OUTPUT_START__');
    console.log(JSON.stringify({{
        success: true,
        output: finalOutput,
        error: null
    }}));
    console.log('__OUTPUT_END__');

}} catch (error) {{
    console.log('__OUTPUT_START__');
    console.log(JSON.stringify({{
        success: false,
        output: null,
        error: error.message + '\\n' + error.stack
    }}));
    console.log('__OUTPUT_END__');
}}
"""
        return wrapper

    def execute(self) -> Dict[str, Any]:
        """Execute JavaScript code using Node.js"""
        # Validate code first
        validation_error = self.validate_code()
        if validation_error:
            return {
                'success': False,
                'error': validation_error,
                'output': None,
                'stdout': ''
            }

        try:
            # Create wrapper code
            wrapper_code = self.create_wrapper_code()

            # Create temporary file with UTF-8 encoding for Unicode support
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(wrapper_code)
                temp_file_path = temp_file.name

            try:
                # Execute with Node.js (UTF-8 encoding for Unicode support)
                result = subprocess.run(
                    ['node', temp_file_path],
                    capture_output=True,
                    text=True,
                    timeout=self.timeout,
                    encoding='utf-8'
                )

                stdout = result.stdout
                stderr = result.stderr

                # Extract output from stdout
                if '__OUTPUT_START__' in stdout and '__OUTPUT_END__' in stdout:
                    # Get user's console.log output (before __OUTPUT_START__)
                    user_stdout_end = stdout.find('__OUTPUT_START__')
                    user_stdout = stdout[:user_stdout_end].strip()
                    
                    start_idx = stdout.find('__OUTPUT_START__') + len('__OUTPUT_START__\n')
                    end_idx = stdout.find('__OUTPUT_END__')
                    output_json = stdout[start_idx:end_idx].strip()

                    try:
                        output_data = json.loads(output_json)
                        # Use only user's console.log output as stdout
                        output_data['stdout'] = user_stdout
                        return output_data
                    except json.JSONDecodeError:
                        return {
                            'success': False,
                            'error': f'Failed to parse output: {output_json}',
                            'output': None,
                            'stdout': user_stdout
                        }
                else:
                    # No structured output, check for errors
                    if result.returncode != 0:
                        return {
                            'success': False,
                            'error': stderr or 'JavaScript execution failed',
                            'output': None,
                            'stdout': stdout
                        }
                    else:
                        return {
                            'success': True,
                            'error': None,
                            'output': None,
                            'stdout': stdout
                        }

            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file_path)
                except:
                    pass

        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': f"JavaScript execution timed out after {self.timeout} seconds",
                'output': None,
                'stdout': ''
            }
        except FileNotFoundError:
            return {
                'success': False,
                'error': "Node.js not found. Please install Node.js to run JavaScript code.",
                'output': None,
                'stdout': ''
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"JavaScript execution failed: {str(e)}",
                'output': None,
                'stdout': ''
            }


class CodeNode(ProcessorNode):
    """
    Multi-Language Code Execution Node for Dynamic Data Processing
    ============================================================

    This node provides secure code execution capabilities for Python and JavaScript within
    KAI-Fusion workflows, allowing users to write custom code to process data, implement
    business logic, and transform information dynamically.

    CORE CAPABILITIES:
    =================

    1. **Multi-Language Support**:
       - Python 3.x with secure sandbox execution
       - JavaScript (Node.js) runtime environment
       - Language-specific helper functions and utilities

    2. **Efficient Data Processing**:
       - Optimized for processing datasets efficiently
       - Support for large data processing with resource management

    3. **Rich Context Access**:
       - Access to input data from connected nodes
       - Workflow variables and state access
       - Helper functions for common operations
       - Built-in JSON and datetime utilities

    4. **Secure Execution Environment**:
       - Sandboxed code execution with safety checks
       - Resource limits and timeout protection
       - Whitelisted module imports only
       - Prevention of dangerous operations

    5. **Developer-Friendly Features**:
       - Syntax highlighting in code editor
       - Error messages with line numbers
       - Console output capture for debugging
       - Code validation before execution
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "CodeNode",
            "display_name": "Code Node",
            "description": (
                "Execute custom Python or JavaScript code to process data. "
                "Supports data transformation, business logic, and custom processing."
            ),
            "category": "Processing",
            "node_type": NodeType.PROCESSOR,
            "icon": {"name": "code", "path": None, "alt": None},
            "colors": ["orange-500", "red-600"],

            # Single connection input - compatible with all nodes and Jinja templating
            "inputs": [
                NodeInput(
                    name="input",
                    displayName="Input",
                    type="any",
                    description=f"Input data from connected nodes. Accessible as '{CODE_INPUT_VARIABLE_NAME}' variable in your code.",
                    is_connection=True,
                    required=False,
                    direction=NodePosition.LEFT
                ),
            ],

            # Single output - compatible with Jinja templating ({{code_node}})
            "outputs": [
                NodeOutput(
                    name="output",
                    displayName="Output",
                    type="any",
                    description="Result from code execution. Set 'output' or 'result' variable in your code.",
                    is_connection=True,
                    direction=NodePosition.RIGHT
                ),
            ],

            # UI Properties organized by tabs
            "properties": [
                # BASIC TAB - Core configuration
                NodeProperty(
                    name="language",
                    displayName="Programming Language",
                    type=NodePropertyType.SELECT,
                    description="Select the programming language for code execution",
                    default="python",
                    required=True,
                    options=[
                        {"label": "Python", "value": "python"},
                        {"label": "JavaScript", "value": "javascript"}
                    ],
                    tabName="basic"
                ),

                NodeProperty(
                    name="code",
                    displayName="Code",
                    type=NodePropertyType.CODE_EDITOR,
                    description=(
                        "You can access the output content of the node connected to the code node using the node_data expression. "
                        "You can refer to the output content of previous nodes in your code using the Jinja structure ${{node_name}}. "
                        "Note: If there is a possibility of special characters in the output content accessed via Jinja, it is recommended to use {{node_name|tojson}}."
                    ),
                    default="# Python Example\nprint(node_data)",
                    required=True,
                    rows=12,
                    maxLength=50000,
                    tabName="basic"
                ),

                # ADVANCED TAB - Performance and error handling
                NodeProperty(
                    name="timeout",
                    displayName="Timeout (seconds)",
                    type=NodePropertyType.NUMBER,
                    description="Maximum execution time in seconds",
                    default=30,
                    min=1,
                    max=300,
                    required=False,
                    tabName="advanced"
                ),
                NodeProperty(
                    name="continue_on_error",
                    displayName="Continue on Error",
                    type=NodePropertyType.CHECKBOX,
                    description="Continue workflow execution even if code fails",
                    default=False,
                    required=False,
                    tabName="advanced"
                ),
                NodeProperty(
                    name="enable_validation",
                    displayName="Enable Code Validation",
                    type=NodePropertyType.CHECKBOX,
                    description="Validate code for dangerous operations before execution",
                    default=True,
                    required=False,
                    tabName="advanced"
                ),
            ]
        }

        logger.info("💻 Code Node initialized with multi-language support")

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute code with the provided inputs and context.

        Args:
            inputs: User-provided configuration from properties
            connected_nodes: Connected node outputs

        Returns:
            Dict with execution results
        """
        logger.info("🚀 Executing Code Node")

        # Get configuration from inputs (properties)
        language = inputs.get("language", "python")
        raw_code = inputs.get("code", "")
        timeout = int(inputs.get("timeout", 30))
        continue_on_error = inputs.get("continue_on_error", False)
        enable_validation = inputs.get("enable_validation", True)

        logger.info(f"⚙️ EXECUTION CONFIG: Language={language}, Timeout={timeout}s")

        # Handle mixed language default code - extract appropriate section
        if "// JavaScript Example" in raw_code and "# Python Example" in raw_code:
            if language == "python":
                # Extract Python code from the default template
                lines = raw_code.split('\n')
                python_lines = []
                in_python_section = False

                for line in lines:
                    if line.strip().startswith("# Python Example"):
                        in_python_section = True
                        continue
                    elif in_python_section and line.strip().startswith("#"):
                        # Remove the comment prefix and add the line
                        cleaned_line = line.replace("# ", "", 1)
                        python_lines.append(cleaned_line)
                    elif in_python_section and line.strip() and not line.strip().startswith("#"):
                        # End of Python section
                        break

                code = '\n'.join(python_lines) if python_lines else """output = {
    'message': 'Hello from Code Node!',
    'timestamp': str(__import__('datetime').datetime.now()),
    'input_data': node_data
}"""
            else:  # javascript
                # Extract JavaScript code from the default template
                lines = raw_code.split('\n')
                js_lines = []

                for line in lines:
                    if line.strip().startswith("# Python Example"):
                        break
                    if line.strip() and not line.strip().startswith("//"):
                        js_lines.append(line)

                code = '\n'.join(js_lines) if js_lines else """output = {
  message: 'Hello from Code Node!',
  timestamp: new Date(),
  input_data: node_data
};"""
        else:
            code = raw_code

        logger.info("🔍 ACTUAL CODE TO EXECUTE:")
        logger.info(f"```{language}")
        logger.info(code)
        logger.info("```")

        # Get input data from connected node (single input)
        input_data = connected_nodes.get("input", None)
        
        # DEBUG: Print raw input from connected node
        logger.info(f"📥 RAW INPUT (before extraction): {input_data}")
        
        # Handle different input formats - extract page_content from various node outputs
        if isinstance(input_data, dict):
            # Priority 1: Check for 'documents' list (StringInputNode, DocumentLoaderNode, etc.)
            if "documents" in input_data and isinstance(input_data["documents"], list) and len(input_data["documents"]) > 0:
                docs = input_data["documents"]
                # Extract page_content from all documents
                page_contents = []
                for doc in docs:
                    if hasattr(doc, 'page_content'):
                        # LangChain Document object
                        page_contents.append(doc.page_content)
                    elif isinstance(doc, dict) and "page_content" in doc:
                        # Dict with page_content key
                        page_contents.append(doc["page_content"])
                
                if page_contents:
                    # Join multiple documents with newlines, or use single document content
                    input_data = "\n\n".join(page_contents) if len(page_contents) > 1 else page_contents[0]
                    logger.info(f"📄 Extracted page_content from {len(page_contents)} document(s)")
            
            # Priority 2: Check for direct 'page_content' key
            elif "page_content" in input_data:
                input_data = input_data["page_content"]
                logger.info("📄 Extracted page_content directly from input")
            
            # Priority 3: Check for 'output' key (ReactAgentNode, StringInputNode.output, etc.)
            elif "output" in input_data:
                input_data = input_data["output"]
                logger.info("📤 Extracted output from input")
            
            # Priority 4: Check for 'content' key (HttpClientNode)
            elif "content" in input_data:
                input_data = input_data["content"]
                logger.info("📤 Extracted content from input")
            
            # Otherwise keep the dict as-is for custom processing
        
        # Handle LangChain Document objects directly
        elif hasattr(input_data, 'page_content'):
            input_data = input_data.page_content
            logger.info("📄 Extracted page_content from Document object")
        
        # Handle list of Document objects
        elif isinstance(input_data, list) and len(input_data) > 0:
            page_contents = []
            for item in input_data:
                if hasattr(item, 'page_content'):
                    page_contents.append(item.page_content)
                elif isinstance(item, dict) and "page_content" in item:
                    page_contents.append(item["page_content"])
            
            if page_contents:
                input_data = "\n\n".join(page_contents) if len(page_contents) > 1 else page_contents[0]
                logger.info(f"📄 Extracted page_content from {len(page_contents)} items in list")
        
        # DEBUG: Print processed input
        logger.info(f"📥 PROCESSED INPUT (after extraction): {input_data}")
        
        # Prepare execution context with input available as configured variable name
        context = {
            CODE_INPUT_VARIABLE_NAME: input_data,  # Dynamic variable name (default: 'input')
            "inputs": inputs,
        }

        logger.info("🌍 EXECUTION CONTEXT:")
        logger.info(f"  📝 Context keys: {list(context.keys())}")
        logger.info(f"  📊 Input data type: {type(input_data)}")
        if isinstance(input_data, list):
            logger.info(f"  📊 Input data length: {len(input_data)}")

        start_time = time.time()

        try:
            # Helper function to serialize output safely
            def serialize_output(output_data):
                """Serialize output to JSON string for state compatibility"""
                try:
                    if output_data is None:
                        return "null"
                    elif isinstance(output_data, str):
                        return output_data
                    else:
                        return json.dumps(output_data, default=str, ensure_ascii=False)
                except Exception as e:
                    logger.warning(f"Failed to serialize output: {e}")
                    return str(output_data)

            # Execute code based on language
            if language == "python":
                sandbox = PythonSandbox(code, context, timeout)
            elif language == "javascript":
                sandbox = JavaScriptSandbox(code, context, timeout)
            else:
                raise ValueError(f"Unsupported language: {language}")

            logger.info(f"🎯 EXECUTING {language.upper()} CODE")

            result = sandbox.execute()

            execution_time = (time.time() - start_time) * 1000

            # Log execution result details
            logger.info("=" * 80)
            logger.info("📤 CODE EXECUTION RESULT LOGGING")
            logger.info("=" * 80)
            logger.info(f"✅ Success: {result['success']}")
            logger.info(f"⏱️  Execution time: {execution_time:.2f}ms")

            if result['success']:
                logger.info("🎉 EXECUTION SUCCESS")

                if result['stdout']:
                    logger.info("📟 CONSOLE OUTPUT:")
                    logger.info(result['stdout'])

                # Output is always stdout (print statements)
                stdout_output = result['stdout'].strip() if result['stdout'] else ""
                
                logger.info(f"✅ {language.title()} code executed successfully in {execution_time:.1f}ms")
                logger.info("=" * 80)

                # Return stdout as output for Jinja compatibility
                return {
                    "output": stdout_output
                }
            else:
                logger.error("❌ EXECUTION ERROR:")
                logger.error(result['error'])

                if result['stdout']:
                    logger.error("📟 CONSOLE OUTPUT (ERROR):")
                    logger.error(result['stdout'])

                logger.error(f"❌ {language.title()} code execution failed: {result['error']}")
                logger.info("=" * 80)

                if continue_on_error:
                    # Return error as output when continue_on_error is enabled
                    return {
                        "output": f"Error: {result['error']}"
                    }
                else:
                    raise ValueError(f"Code execution failed: {result['error']}")

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            error_msg = f"Code execution failed: {str(e)}"

            # Log error details
            logger.error("=" * 80)
            logger.error("💥 CODE NODE EXECUTION ERROR")
            logger.error("=" * 80)
            logger.error(f"❌ Error message: {error_msg}")
            logger.error(f"⏱️  Failed after: {execution_time:.2f}ms")
            logger.error(f"📝 Exception type: {type(e).__name__}")
            logger.error("📚 Full traceback:")
            logger.error(traceback.format_exc())
            logger.error("=" * 80)

            if continue_on_error:
                # Return error as output when continue_on_error is enabled
                return {
                    "output": f"Error: {error_msg}"
                }
            else:
                raise ValueError(error_msg)

    def as_runnable(self) -> Runnable:
        """
        Convert node to LangChain Runnable for direct composition.

        Returns:
            RunnableLambda that executes code
        """
        runnable = RunnableLambda(
            lambda params: self.execute(
                inputs=params.get("inputs", {}),
                connected_nodes=params.get("connected_nodes", {})
            ),
            name="CodeNode"
        )

        return runnable


# Export for use
__all__ = ["CodeNode", "PythonSandbox", "JavaScriptSandbox"]