from typing import Dict, Any, List, Callable
from langchain_core.runnables import Runnable, RunnableLambda, RunnableBranch
from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType

class ConditionNode(ProcessorNode):
    """
    Conditional logic node that routes flow based on conditions
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "Condition",
            "display_name": "Condition Node",
            "description": "Routes workflow based on conditional logic",
            "category": "Logic",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(
                    name="input", 
                    type="any", 
                    description="Input to evaluate", 
                    is_connection=True,
                    required=True
                ),
                NodeInput(
                    name="conditions",
                    type="list",
                    description="List of condition definitions",
                    default=[]
                ),
                NodeInput(
                    name="condition_type",
                    type="str",
                    description="Type of condition: 'contains', 'equals', 'greater_than', 'less_than'",
                    default="contains"
                ),
                NodeInput(
                    name="default_value",
                    type="any",
                    description="Default value if no conditions match",
                    default="false"
                )
            ],
            "outputs": [
                NodeOutput(name="true", type="any", description="Output when condition is true"),
                NodeOutput(name="false", type="any", description="Output when condition is false"),
                NodeOutput(name="output", type="any", description="Primary output")
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute conditional logic"""
        conditions = inputs.get("conditions", [])
        condition_type = inputs.get("condition_type", "contains")
        default_value = inputs.get("default_value", "false")
        
        def evaluate_conditions(data: Any) -> str:
            """Evaluate conditions against input data"""
            input_value = data.get("input", data) if isinstance(data, dict) else data
            input_str = str(input_value).lower()
            
            # Evaluate each condition
            for condition in conditions:
                if isinstance(condition, dict):
                    rule = condition.get("rule", "")
                    value = condition.get("value", "")
                    
                    if self._check_condition(input_str, rule, value, condition_type):
                        return "true"
                elif isinstance(condition, str):
                    if self._check_condition(input_str, condition, "", condition_type):
                        return "true"
            
            return "false"
        
        return RunnableLambda(evaluate_conditions)
    
    def _check_condition(self, input_str: str, rule: str, value: str, condition_type: str) -> bool:
        """Check if a single condition is met"""
        rule_lower = str(rule).lower()
        value_lower = str(value).lower()
        
        try:
            if condition_type == "contains":
                return rule_lower in input_str
            elif condition_type == "equals":
                return input_str == rule_lower
            elif condition_type == "starts_with":
                return input_str.startswith(rule_lower)
            elif condition_type == "ends_with":
                return input_str.endswith(rule_lower)
            elif condition_type == "greater_than":
                try:
                    return float(input_str) > float(rule_lower)
                except ValueError:
                    return len(input_str) > len(rule_lower)
            elif condition_type == "less_than":
                try:
                    return float(input_str) < float(rule_lower)
                except ValueError:
                    return len(input_str) < len(rule_lower)
            elif condition_type == "regex":
                import re
                return bool(re.search(rule_lower, input_str))
            else:
                # Default to contains
                return rule_lower in input_str
        except Exception:
            return False 