from typing import Dict, Any
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.tools import Tool
from .base import ProviderNode, ProcessorNode, NodeInput, NodeOutput, NodeType

class TestHelloNode(ProviderNode):
    _metadatas = {
        "name": "TestHello",
        "display_name": "Test Hello",
        "description": "A simple test node that creates a greeting tool",
        "category": "Test",
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(name="greeting", type="str", description="Greeting text", default="Hello", required=False),
            NodeInput(name="name", type="str", description="Name to greet", default="World", required=False),
        ],
        "outputs": [
            NodeOutput(name="output", type="tool", description="Greeting tool")
        ]
    }

    def _execute(self, greeting: str = "Hello", name: str = "World") -> Runnable:
        # Create a simple Tool that returns a greeting - Tools are serializable
        
        def hello_function(inputs):
            """Simple greeting function"""
            if isinstance(inputs, dict):
                query = inputs.get("input", inputs.get("query", ""))
            else:
                query = str(inputs)
            return f"{greeting}, {name}! You said: {query}"
        
        return Tool(
            name="test_hello",
            description=f"Returns a greeting: {greeting}, {name}",
            func=hello_function
        )

class TestProcessorNode(ProcessorNode):
    """Test processor node that combines multiple inputs"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "TestProcessor",
            "display_name": "Test Processor",
            "description": "A test processor that combines multiple inputs",
            "category": "Test",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="input", type="str", description="Text input", required=True, is_connection=False),
                NodeInput(name="tool", type="tool", description="Connected tool", required=False, is_connection=True),
                NodeInput(name="prefix", type="str", description="Prefix text", default="Result:", required=False),
            ],
            "outputs": [
                NodeOutput(name="output", type="str", description="Combined result")
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute the processor node"""
        input_text = inputs.get("input", "")
        prefix = inputs.get("prefix", "Result:")
        tool = connected_nodes.get("tool")
        
        def process_function(data):
            """Process the inputs"""
            result_parts = [prefix]
            
            # Add input text
            if input_text:
                result_parts.append(f"Input: {input_text}")
            
            # Use tool if available
            if tool:
                try:
                    # Check if it's a Tool instance with func attribute
                    if hasattr(tool, 'func') and callable(getattr(tool, 'func')):
                        tool_result = tool.func(input_text or "test")  # type: ignore[attr-defined]
                        result_parts.append(f"Tool: {tool_result}")
                    # Or try to invoke as Runnable
                    elif hasattr(tool, 'invoke'):
                        tool_result = tool.invoke({"input": input_text or "test"})
                        result_parts.append(f"Tool: {tool_result}")
                    else:
                        result_parts.append(f"Tool: {str(tool)}")
                except Exception as e:
                    result_parts.append(f"Tool Error: {str(e)}")
            
            return " | ".join(result_parts)
        
        return RunnableLambda(process_function) 