"""
Conditional chain node implementation
"""
from typing import Dict, Any, List, Callable, Union
from langchain_core.runnables import Runnable, RunnableBranch, RunnableLambda

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeMetadata, NodeType

class ConditionalChainNode(ProcessorNode):
    """Routes to different chains based on conditions"""
    
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "ConditionalChain",
            "description": "Routes to different chains based on conditions",
            "category": "Chains",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(
                    name="default_chain", 
                    type="chain", 
                    description="Default chain to use if no conditions match", 
                    is_connection=True,
                    required=True
                ),
                NodeInput(
                    name="condition_chains", 
                    type="dict", 
                    description="Dictionary mapping condition strings to chain node IDs", 
                    default={}
                ),
                NodeInput(
                    name="condition_type",
                    type="str",
                    description="Type of condition check: 'contains', 'equals', 'startswith', 'custom'",
                    default="contains"
                ),
                NodeInput(
                    name="condition_field",
                    type="str",
                    description="Field to check in input (e.g., 'input', 'query', 'text')",
                    default="input"
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output", 
                    type="chain", 
                    description="Conditional chain router"
                )
            ]
        }
    
    def _execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute node to create a conditional chain"""
        default_chain = connected_nodes.get("default_chain")
        condition_chains = inputs.get("condition_chains", {})
        condition_type = inputs.get("condition_type", "contains")
        condition_field = inputs.get("condition_field", "input")
        
        if not default_chain:
            raise ValueError("No default chain provided")
        
        # Build branch conditions
        branches = []
        
        for condition_str, chain_id in condition_chains.items():
            if chain_id in connected_nodes:
                chain = connected_nodes[chain_id]
                condition_func = self._create_condition_function(
                    condition_str, condition_type, condition_field
                )
                branches.append((condition_func, chain))
        
        # Create runnable branch
        if branches:
            # Add default as the last option
            return RunnableBranch(*branches, default_chain)
        else:
            # No conditions, just return default
            return default_chain
    
    def _create_condition_function(
        self, 
        condition: str, 
        condition_type: str, 
        field: str
    ) -> Callable[[Dict[str, Any]], bool]:
        """Create a condition function based on type"""
        
        def check_condition(x: Dict[str, Any]) -> bool:
            value = x.get(field, "")
            if isinstance(value, dict):
                # If value is a dict, try to get common fields
                value = value.get("input", value.get("query", str(value)))
            
            value_str = str(value).lower()
            condition_lower = condition.lower()
            
            if condition_type == "contains":
                return condition_lower in value_str
            elif condition_type == "equals":
                return value_str == condition_lower
            elif condition_type == "startswith":
                return value_str.startswith(condition_lower)
            elif condition_type == "custom":
                # For custom conditions, evaluate as Python expression
                # BE CAREFUL: This can be dangerous in production
                try:
                    return eval(condition, {"x": x, "value": value})
                except:
                    return False
            else:
                return False
        
        return check_condition


class RouterChainNode(ProcessorNode):
    """Advanced router that can route based on multiple criteria"""
    
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "RouterChain",
            "description": "Advanced routing based on multiple criteria",
            "category": "Chains",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(
                    name="routes",
                    type="list[dict]",
                    description="List of route definitions with conditions and chains",
                    default=[]
                ),
                NodeInput(
                    name="default_chain",
                    type="chain",
                    description="Default chain if no routes match",
                    is_connection=True,
                    required=True
                ),
                NodeInput(
                    name="route_selector",
                    type="str",
                    description="How to select route: 'first_match', 'all_matches', 'best_match'",
                    default="first_match"
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="chain",
                    description="Router chain"
                )
            ]
        }
    
    def _execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Create a router chain"""
        routes = inputs.get("routes", [])
        default_chain = connected_nodes.get("default_chain")
        route_selector = inputs.get("route_selector", "first_match")
        
        if not default_chain:
            raise ValueError("No default chain provided")
        
        # Build routing function
        def route_function(x: Dict[str, Any]) -> Any:
            matched_chains = []
            
            for route in routes:
                conditions = route.get("conditions", {})
                chain_id = route.get("chain_id")
                priority = route.get("priority", 0)
                
                if chain_id in connected_nodes and self._check_conditions(x, conditions):
                    matched_chains.append((priority, connected_nodes[chain_id]))
            
            if not matched_chains:
                return default_chain
            
            if route_selector == "first_match":
                return matched_chains[0][1]
            elif route_selector == "best_match":
                # Sort by priority (highest first)
                matched_chains.sort(key=lambda x: x[0], reverse=True)
                return matched_chains[0][1]
            elif route_selector == "all_matches":
                # Return a sequential chain of all matches
                from langchain.chains import SequentialChain
                chains = [chain for _, chain in matched_chains]
                return SequentialChain(chains=chains)
            
            return default_chain
        
        return RunnableLambda(route_function)
    
    def _check_conditions(self, x: Dict[str, Any], conditions: Dict[str, Any]) -> bool:
        """Check if all conditions are met"""
        for field, condition in conditions.items():
            value = x.get(field)
            
            if isinstance(condition, dict):
                # Complex condition
                op = condition.get("op", "equals")
                target = condition.get("value")
                
                if not self._check_single_condition(value, op, target):
                    return False
            else:
                # Simple equality check
                if value != condition:
                    return False
        
        return True
    
    def _check_single_condition(self, value: Any, op: str, target: Any) -> bool:
        """Check a single condition"""
        if op == "equals":
            return value == target
        elif op == "contains":
            return str(target) in str(value)
        elif op == "gt":
            return float(value) > float(target)
        elif op == "lt":
            return float(value) < float(target)
        elif op == "in":
            return value in target
        elif op == "not_in":
            return value not in target
        else:
            return False
