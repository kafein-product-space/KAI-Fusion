from .base import ProviderNode, NodeInput, NodeType
from langchain_core.runnables import RunnableLambda
from langchain_core.runnables import Runnable

class TestHelloNode(ProviderNode):
    _metadatas = {
        "name": "TestHello",
        "description": "A simple test node that says hello with a custom message",
    
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(
                name="greeting", 
                type="string", 
                description="Custom greeting message", 
                default="Hello", 
                required=False
            ),
            NodeInput(
                name="name", 
                type="string", 
                description="Name to greet", 
                default="World", 
                required=False
            )
        ]
    }

    def _execute(self, greeting: str = "Hello", name: str = "World") -> Runnable:
        # Create a simple Tool that returns a greeting - Tools are serializable
        from langchain.tools import Tool
        
        def hello_function(inputs):
            user_input = inputs.get("input", "")
            return f"{greeting} {name}! You said: {user_input}"
        
        return Tool(
            name="TestHello",
            description=f"A test tool that greets with '{greeting} {name}'",
            func=hello_function
        ) 