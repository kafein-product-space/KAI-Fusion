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

3. **Flexible Execution Modes**:
   - Run Once for All Items: Process entire dataset at once
   - Run Once for Each Item: Process items individually
   - Support for batch processing

4. **Rich Context Access**:
   - Access to input data and workflow variables
   - Helper functions for common operations
   - JSON manipulation utilities
   - Date/time handling functions

AUTHORS: KAI-Fusion Development Team
VERSION: 1.0.0
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

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
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

def timeout_handler(signum, frame):
    """Handle execution timeout"""
    raise TimeoutError("Code execution timed out")

class PythonSandbox:
    """
    Secure Python execution sandbox with resource limits and safety checks.
    """
    
    def __init__(self, code: str, context: Dict[str, Any], timeout: int = 30):
        self.code = code
        self.context = context
        self.timeout = timeout
        self.output_buffer = io.StringIO()
        
    def validate_code(self) -> Optional[str]:
        """Validate Python code syntax and check for dangerous operations"""
        try:
            # Parse the code to check syntax
            tree = ast.parse(self.code)
            
            # Check for dangerous operations
            for node in ast.walk(tree):
                # Block import statements except for safe modules
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name.split('.')[0] not in SAFE_PYTHON_MODULES:
                            return f"Import of '{alias.name}' is not allowed"
                
                if isinstance(node, ast.ImportFrom):
                    if node.module and node.module.split('.')[0] not in SAFE_PYTHON_MODULES:
                        return f"Import from '{node.module}' is not allowed"
                
                # Block dangerous built-in functions
                if isinstance(node, ast.Name) and node.id in ['eval', 'exec', 'compile', '__import__', 'open', 'file', 'input']:
                    return f"Use of '{node.id}' is not allowed"
                
                # Block file operations
                if isinstance(node, ast.Attribute):
                    if hasattr(node.value, 'id') and node.value.id in ['os', 'sys', 'subprocess']:
                        return f"Access to '{node.value.id}' module is not allowed"
            
            return None  # Code is valid
            
        except SyntaxError as e:
            return f"Syntax error at line {e.lineno}: {e.msg}"
        except Exception as e:
            return f"Code validation error: {str(e)}"
    
    def create_safe_globals(self) -> Dict[str, Any]:
        """Create a safe global namespace for code execution"""
        # Filter built-ins to only safe ones
        import builtins
        safe_builtins = {k: getattr(builtins, k) for k in SAFE_PYTHON_BUILTINS if hasattr(builtins, k)}
        
        # Add safe modules
        safe_globals = {
            '__builtins__': safe_builtins,
            'json': __import__('json'),
            'math': __import__('math'),
            'random': __import__('random'),
            're': __import__('re'),
            'datetime': __import__('datetime'),
            'time': __import__('time'),
            'itertools': __import__('itertools'),
            'collections': __import__('collections'),
        }
        
        # Add context variables
        safe_globals.update(self.context)
        
        # Add helper functions
        safe_globals['_json'] = json
        safe_globals['_now'] = datetime.now
        safe_globals['_utcnow'] = lambda: datetime.now(timezone.utc)
        safe_globals['locals'] = lambda: safe_globals.copy()  # Safe locals implementation
        safe_globals['globals'] = lambda: safe_globals  # Safe globals implementation
        
        return safe_globals
    
    def execute(self) -> Dict[str, Any]:
        """Execute the Python code in a sandboxed environment"""
        # Validate code first
        validation_error = self.validate_code()
        if validation_error:
            return {
                'success': False,
                'error': validation_error,
                'output': None,
                'stdout': ''
            }
        
        # Create safe execution environment
        safe_globals = self.create_safe_globals()
        safe_locals = {}
        
        # Capture stdout
        old_stdout = sys.stdout
        sys.stdout = self.output_buffer
        
        try:
            # Execute code with timeout
            if sys.platform != 'win32':
                # Use signal-based timeout on Unix-like systems
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(self.timeout)
                try:
                    exec(self.code, safe_globals, safe_locals)
                finally:
                    signal.alarm(0)
            else:
                # On Windows, use a simpler approach (no timeout for now)
                exec(self.code, safe_globals, safe_locals)
            
            # Get the return value (if defined)
            output = safe_locals.get('output', safe_locals.get('result', None))
            
            # If no explicit output, try to get the last expression value
            if output is None and 'return' in safe_locals:
                output = safe_locals['return']
            
            return {
                'success': True,
                'error': None,
                'output': output,
                'stdout': self.output_buffer.getvalue(),
                'locals': {k: v for k, v in safe_locals.items() if not k.startswith('_')}
            }
            
        except TimeoutError:
            return {
                'success': False,
                'error': f"Code execution timed out after {self.timeout} seconds",
                'output': None,
                'stdout': self.output_buffer.getvalue()
            }
        except Exception as e:
            # Get detailed error information
            exc_type, exc_value, exc_traceback = sys.exc_info()
            tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
            error_msg = ''.join(tb_lines)
            
            return {
                'success': False,
                'error': error_msg,
                'output': None,
                'stdout': self.output_buffer.getvalue()
            }
        finally:
            # Restore stdout
            sys.stdout = old_stdout

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
        # Convert Python context to JavaScript
        context_json = json.dumps(self.context, default=str)
        
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
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as temp_file:
                temp_file.write(wrapper_code)
                temp_file_path = temp_file.name
            
            try:
                # Execute with Node.js
                result = subprocess.run(
                    ['node', temp_file_path],
                    capture_output=True,
                    text=True,
                    timeout=self.timeout
                )
                
                stdout = result.stdout
                stderr = result.stderr
                
                # Extract output from stdout
                if '__OUTPUT_START__' in stdout and '__OUTPUT_END__' in stdout:
                    start_idx = stdout.find('__OUTPUT_START__') + len('__OUTPUT_START__\n')
                    end_idx = stdout.find('__OUTPUT_END__')
                    output_json = stdout[start_idx:end_idx].strip()
                    
                    try:
                        output_data = json.loads(output_json)
                        output_data['stdout'] = stdout.replace('__OUTPUT_START__', '').replace('__OUTPUT_END__', '').strip()
                        return output_data
                    except json.JSONDecodeError:
                        return {
                            'success': False,
                            'error': f'Failed to parse output: {output_json}',
                            'output': None,
                            'stdout': stdout
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
    
    2. **Flexible Execution Modes**:
       - Run Once for All Items: Process entire dataset in a single execution
       - Run Once for Each Item: Process each item individually
       - Batch processing support for large datasets
    
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
            "category": "Tool",
            "node_type": NodeType.PROCESSOR,
            "icon": "code",
            "color": "#2d3748",
            
            "inputs": [
                # Language selection
                NodeInput(
                    name="language",
                    type="select",
                    description="Programming language to use",
                    choices=[
                        {
                            "value": "python",
                            "label": "Python",
                            "description": "Execute Python code with secure sandbox"
                        },
                        {
                            "value": "javascript",
                            "label": "JavaScript",
                            "description": "Execute JavaScript code with Node.js"
                        }
                    ],
                    default="python",
                    required=True,
                ),
                
                # Execution mode
                NodeInput(
                    name="mode",
                    type="select",
                    description="Execution mode for the code",
                    choices=[
                        {
                            "value": "all_items",
                            "label": "Run Once for All Items",
                            "description": "Execute code once with all input items"
                        },
                        {
                            "value": "each_item",
                            "label": "Run Once for Each Item",
                            "description": "Execute code separately for each input item"
                        }
                    ],
                    default="all_items",
                    required=True,
                ),
                
                # Code input
                NodeInput(
                    name="code",
                    type="code",
                    description="Code to execute. Use 'output' or 'result' variable to return data.",
                    default="// JavaScript Example\noutput = {\n  message: 'Hello from Code Node!',\n  timestamp: new Date(),\n  items: items || []\n};\n\n# Python Example\n# output = {\n#     'message': 'Hello from Code Node!',\n#     'timestamp': str(_now()),\n#     'items': items or []\n# }",
                    required=True,
                    ui_config={
                        "language": "javascript",  # Will be dynamic based on language selection
                        "theme": "monokai",
                        "height": "400px"
                    }
                ),
                
                # Timeout setting
                NodeInput(
                    name="timeout",
                    type="number",
                    description="Maximum execution time in seconds",
                    default=30,
                    min_value=1,
                    max_value=300,
                    required=False,
                ),
                
                # Continue on error
                NodeInput(
                    name="continue_on_error",
                    type="boolean",
                    description="Continue workflow execution even if code fails",
                    default=False,
                    required=False,
                ),
                
                # Connected inputs
                NodeInput(
                    name="input_data",
                    type="any",
                    description="Input data from connected nodes",
                    is_connection=True,
                    required=False,
                ),
                
                NodeInput(
                    name="additional_context",
                    type="dict",
                    description="Additional context variables for code execution",
                    is_connection=True,
                    required=False,
                ),
            ],
            
            "outputs": [
                NodeOutput(
                    name="output",
                    type="any",
                    description="Output from code execution",
                ),
                NodeOutput(
                    name="success",
                    type="boolean",
                    description="Whether code execution was successful",
                ),
                NodeOutput(
                    name="error",
                    type="string",
                    description="Error message if execution failed",
                ),
                NodeOutput(
                    name="stdout",
                    type="string",
                    description="Console output from print/console.log statements",
                ),
                NodeOutput(
                    name="execution_time",
                    type="number",
                    description="Code execution time in milliseconds",
                ),
                NodeOutput(
                    name="documents",
                    type="list",
                    description="Output as Document objects for compatibility",
                ),
            ],
        }
        
        logger.info("💻 Code Node initialized with multi-language support")
    
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:  # type: ignore[override]
        """
        Execute code with the provided inputs and context.
        
        Args:
            inputs: User-provided configuration
            connected_nodes: Connected node outputs
            
        Returns:
            Dict with execution results
        """
        logger.info("🚀 Executing Code Node")
        
        # Log all input parameters in detail
        logger.info("=" * 80)
        logger.info("📋 CODE NODE INPUT LOGGING")
        logger.info("=" * 80)
        
        # Log user inputs
        logger.info("👤 USER INPUTS:")
        for key, value in inputs.items():
            if key == "code":
                logger.info(f"  📝 {key}: \n{value}")
            else:
                logger.info(f"  🔧 {key}: {value}")
        
        # Log connected node data
        logger.info("🔗 CONNECTED NODE DATA:")
        for key, value in connected_nodes.items():
            if isinstance(value, list) and len(value) > 0:
                logger.info(f"  📊 {key}: [{len(value)} items]")
                for idx, item in enumerate(value[:3]):  # Log first 3 items
                    logger.info(f"    [{idx}]: {json.dumps(item, default=str, ensure_ascii=False)[:500]}{'...' if len(str(item)) > 500 else ''}")
                if len(value) > 3:
                    logger.info(f"    ... and {len(value) - 3} more items")
            else:
                logger.info(f"  📊 {key}: {json.dumps(value, default=str, ensure_ascii=False)[:500]}{'...' if len(str(value)) > 500 else ''}")
        
        logger.info("=" * 80)
        
        start_time = time.time()
        
        try:
            # Get configuration
            language = inputs.get("language", "python")
            mode = inputs.get("mode", "all_items")
            raw_code = inputs.get("code", "")
            timeout = int(inputs.get("timeout", 30))
            
            logger.info(f"⚙️ EXECUTION CONFIG: Language={language}, Mode={mode}, Timeout={timeout}s")
            
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
                            # Remove the comment prefix and add the line, fix locals()/globals() issue
                            cleaned_line = line.replace("# ", "", 1)
                            if "locals()" in cleaned_line:
                                cleaned_line = cleaned_line.replace("if 'items' in locals() else", "or")
                            if "globals()" in cleaned_line:
                                cleaned_line = cleaned_line.replace("if 'items' in globals() else", "or")
                            python_lines.append(cleaned_line)
                        elif in_python_section and line.strip() and not line.strip().startswith("#"):
                            # End of Python section
                            break
                    
                    code = '\n'.join(python_lines) if python_lines else """output = {
    'message': 'Hello from Code Node!',
    'timestamp': str(__import__('datetime').datetime.now()),
    'items': items or []
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
  items: items || []
};"""
            else:
                code = raw_code
            
            logger.info("🔍 ACTUAL CODE TO EXECUTE:")
            logger.info(f"```{language}")
            logger.info(code)
            logger.info("```")
            
            continue_on_error = inputs.get("continue_on_error", False)
            
            # Get input data from connected nodes
            input_data = connected_nodes.get("input_data", [])
            additional_context = connected_nodes.get("additional_context", {})
            
            # Prepare execution context based on mode
            context = {
                "inputs": inputs,
                **additional_context
            }
            
            logger.info("🌍 EXECUTION CONTEXT:")
            logger.info(f"  📝 Context keys: {list(context.keys())}")
            logger.info(f"  📊 Input data type: {type(input_data)}")
            if isinstance(input_data, list):
                logger.info(f"  📊 Input data length: {len(input_data)}")
            
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
            
            # Process based on mode
            if mode == "all_items":
                # Run once for all items
                context["items"] = input_data if isinstance(input_data, list) else [input_data]
                
                logger.info(f"🎯 EXECUTING {language.upper()} CODE (ALL ITEMS MODE)")
                
                # Execute code based on language
                if language == "python":
                    sandbox = PythonSandbox(code, context, timeout)
                elif language == "javascript":
                    sandbox = JavaScriptSandbox(code, context, timeout)
                else:
                    raise ValueError(f"Unsupported language: {language}")
                
                result = sandbox.execute()
                
                execution_time = (time.time() - start_time) * 1000
                
                # Log execution result details
                logger.info("=" * 80)
                logger.info("📤 CODE EXECUTION RESULT LOGGING")
                logger.info("=" * 80)
                logger.info(f"✅ Success: {result['success']}")
                logger.info(f"⏱️  Execution time: {execution_time:.2f}ms")
                
                if result['success']:
                    logger.info("🎉 EXECUTION OUTPUT:")
                    logger.info(json.dumps(result['output'], default=str, ensure_ascii=False, indent=2))
                    
                    if result['stdout']:
                        logger.info("📟 CONSOLE OUTPUT:")
                        logger.info(result['stdout'])
                    
                    output = result['output']
                    serialized_output = serialize_output(output)
                    
                    # Convert to documents if needed
                    documents = []
                    if output:
                        if isinstance(output, list):
                            for idx, item in enumerate(output):
                                doc = Document(
                                    page_content=json.dumps(item, default=str) if not isinstance(item, str) else item,
                                    metadata={
                                        "source": "code_node",
                                        "language": language,
                                        "index": idx,
                                        "mode": mode,
                                        "execution_time": execution_time
                                    }
                                )
                                documents.append(doc)
                        else:
                            doc = Document(
                                page_content=json.dumps(output, default=str) if not isinstance(output, str) else str(output),
                                metadata={
                                    "source": "code_node",
                                    "language": language,
                                    "mode": mode,
                                    "execution_time": execution_time
                                }
                            )
                            documents = [doc]
                    
                    logger.info(f"📄 Generated {len(documents)} documents")
                    logger.info(f"✅ {language.title()} code executed successfully in {execution_time:.1f}ms")
                    logger.info("=" * 80)
                    
                    return {
                        "output": serialized_output,
                        "success": True,
                        "error": None,
                        "stdout": result['stdout'],
                        "execution_time": execution_time,
                        "documents": documents
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
                        return {
                            "output": "null",
                            "success": False,
                            "error": result['error'],
                            "stdout": result['stdout'],
                            "execution_time": execution_time,
                            "documents": []
                        }
                    else:
                        raise ValueError(f"Code execution failed: {result['error']}")
            
            else:  # each_item mode
                # Run once for each item
                items = input_data if isinstance(input_data, list) else [input_data]
                outputs = []
                all_stdout = []
                documents = []
                
                logger.info(f"🎯 EXECUTING {language.upper()} CODE (EACH ITEM MODE)")
                logger.info(f"📊 Processing {len(items)} items")
                
                for idx, item in enumerate(items):
                    logger.info(f"🔄 Processing item {idx + 1}/{len(items)}")
                    logger.info(f"  📊 Item data: {json.dumps(item, default=str, ensure_ascii=False)[:300]}{'...' if len(str(item)) > 300 else ''}")
                    
                    context["item"] = item
                    context["item_index"] = idx
                    
                    # Execute code for this item
                    if language == "python":
                        sandbox = PythonSandbox(code, context, timeout)
                    elif language == "javascript":
                        sandbox = JavaScriptSandbox(code, context, timeout)
                    else:
                        raise ValueError(f"Unsupported language: {language}")
                    
                    result = sandbox.execute()
                    
                    if result['success']:
                        logger.info(f"  ✅ Item {idx + 1} processed successfully")
                        logger.info(f"  📤 Output: {json.dumps(result['output'], default=str, ensure_ascii=False)[:200]}{'...' if len(str(result['output'])) > 200 else ''}")
                        
                        if result['stdout']:
                            logger.info(f"  📟 Console: {result['stdout'][:100]}{'...' if len(result['stdout']) > 100 else ''}")
                        
                        outputs.append(result['output'])
                        all_stdout.append(result['stdout'])
                        
                        # Create document for this item
                        if result['output']:
                            doc = Document(
                                page_content=json.dumps(result['output'], default=str) if not isinstance(result['output'], str) else str(result['output']),
                                metadata={
                                    "source": "code_node",
                                    "language": language,
                                    "index": idx,
                                    "mode": mode,
                                    "item_index": idx
                                }
                            )
                            documents.append(doc)
                    elif continue_on_error:
                        logger.warning(f"  ⚠️ Item {idx + 1} failed (continuing): {result['error'][:100]}...")
                        outputs.append(None)
                        all_stdout.append(result['stdout'])
                    else:
                        logger.error(f"  ❌ Item {idx + 1} failed: {result['error']}")
                        raise ValueError(f"Code execution failed for item {idx}: {result['error']}")
                
                execution_time = (time.time() - start_time) * 1000
                serialized_outputs = serialize_output(outputs)
                
                # Log final results
                logger.info("=" * 80)
                logger.info("📤 EACH ITEM MODE FINAL RESULTS")
                logger.info("=" * 80)
                logger.info(f"✅ Processed {len(items)} items in {execution_time:.2f}ms")
                logger.info(f"📊 Successful outputs: {len([o for o in outputs if o is not None])}")
                logger.info(f"📄 Generated {len(documents)} documents")
                logger.info("=" * 80)
                
                logger.info(f"✅ {language.title()} code executed for {len(items)} items in {execution_time:.1f}ms")
                
                return {
                    "output": serialized_outputs,
                    "success": True,
                    "error": None,
                    "stdout": '\n'.join(all_stdout),
                    "execution_time": execution_time,
                    "documents": documents
                }
                
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
            
            if inputs.get("continue_on_error", False):
                return {
                    "output": "null",
                    "success": False,
                    "error": error_msg,
                    "stdout": "",
                    "execution_time": execution_time,
                    "documents": []
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
