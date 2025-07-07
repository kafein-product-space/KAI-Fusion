import os
from typing import Any
from ..base import ProviderNode, NodeInput, NodeType
from langchain.tools import Tool
from langchain_core.runnables import Runnable

class WriteFileToolNode(ProviderNode):
    """File writing tool"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "WriteFileTool",
            "display_name": "Write File Tool",

            "description": "Write content to files",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="base_path",
                    type="str",
                    description="Base directory for file operations",
                    default="./workspace",
                    required=False
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the write file tool node"""
        base_path = kwargs.get("base_path", "./workspace")
        
        # Ensure base path exists
        os.makedirs(base_path, exist_ok=True)
        
        def write_file(file_input: str) -> str:
            """Write content to a file. Input format: 'filename|content'"""
            try:
                parts = file_input.split('|', 1)
                if len(parts) != 2:
                    return "Error: Input should be in format 'filename|content'"
                
                filename, content = parts
                
                # Security: prevent path traversal
                safe_filename = os.path.basename(filename.strip())
                file_path = os.path.join(base_path, safe_filename)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                return f"Successfully wrote {len(content)} characters to {safe_filename}"
                
            except Exception as e:
                return f"Error writing file: {str(e)}"
        
        return Tool(
            name="WriteFile",
            description="Write content to a file. Input format: 'filename|content'",
            func=write_file
        )

class ReadFileToolNode(ProviderNode):
    """File reading tool"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "ReadFileTool",
            "display_name": "Read File Tool",

            "description": "Read content from files",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="base_path",
                    type="str",
                    description="Base directory for file operations",
                    default="./workspace",
                    required=False
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the read file tool node"""
        base_path = kwargs.get("base_path", "./workspace")
        
        def read_file(filename: str) -> str:
            """Read content from a file"""
            try:
                # Security: prevent path traversal
                safe_filename = os.path.basename(filename.strip())
                file_path = os.path.join(base_path, safe_filename)
                
                if not os.path.exists(file_path):
                    return f"Error: File '{safe_filename}' not found"
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                return f"Content of {safe_filename}:\n{content}"
                
            except Exception as e:
                return f"Error reading file: {str(e)}"
        
        return Tool(
            name="ReadFile",
            description="Read content from a file. Input should be the filename.",
            func=read_file
        )
