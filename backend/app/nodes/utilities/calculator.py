from typing import Any
from ..base import ProviderNode, NodeInput, NodeType
from langchain.tools import Tool
import re
import math

class CalculatorNode(ProviderNode):
    """Calculator tool node for mathematical operations"""
    
    _metadatas = {
        "name": "Calculator",
        "description": "Mathematical expression calculator tool",
        "node_type": NodeType.PROVIDER,
        "inputs": []
    }

    def _execute(self) -> Tool:
        """Execute the Calculator node and return a calculator tool"""
        
        def safe_calculate(expression: str) -> str:
            """Safely evaluate mathematical expressions"""
            try:
                # Clean the expression
                expression = expression.strip()
                
                # Remove any non-mathematical characters
                allowed_chars = re.compile(r'^[0-9+\-*/().\s]+$')
                if not allowed_chars.match(expression):
                    return "Error: Invalid characters in expression. Only numbers, +, -, *, /, (, ), and . are allowed."
                
                # Replace ** with ^ for power operations if needed
                expression = expression.replace('^', '**')
                
                # Evaluate the expression safely
                result = eval(expression, {"__builtins__": {}, "math": math})
                
                return str(result)
                
            except ZeroDivisionError:
                return "Error: Division by zero"
            except SyntaxError:
                return "Error: Invalid mathematical expression"
            except Exception as e:
                return f"Error: {str(e)}"
        
        return Tool(
            name="Calculator",
            description="Useful for mathematical calculations. Input should be a mathematical expression like '2+2' or '10*5/2'",
            func=safe_calculate
        ) 