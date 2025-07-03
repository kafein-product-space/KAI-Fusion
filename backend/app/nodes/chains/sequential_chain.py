"""
Sequential chain node implementation
"""
from typing import Dict, Any, List
from langchain.chains import SequentialChain, LLMChain
from langchain_core.runnables import Runnable

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeMetadata, NodeType

class SequentialChainNode(ProcessorNode):
    """Chains multiple LLM calls sequentially"""
    
    _metadatas = {
        "name": "SequentialChain",
        "description": "Chains multiple LLM calls sequentially, passing output from one to the next",
        "category": "Chains",
        "node_type": NodeType.PROCESSOR,
        "inputs": [
            NodeInput(
                name="chains", 
                type="list[chain]", 
                description="List of chains to execute sequentially", 
                is_connection=True,
                required=True
            ),
            NodeInput(
                name="input_variables", 
                type="list[str]", 
                description="Input variable names", 
                default=["input"]
            ),
            NodeInput(
                name="output_variables", 
                type="list[str]", 
                description="Output variable names", 
                default=["output"]
            ),
            NodeInput(
                name="return_all",
                type="bool",
                description="Return all intermediate outputs",
                default=False
            )
        ],
        "outputs": [
            NodeOutput(
                name="output", 
                type="chain", 
                description="Sequential chain executor"
            )
        ]
    }
    

    
    def _execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> SequentialChain:
        """Execute node to create a sequential chain"""
        chains = connected_nodes.get("chains", [])
        
        if not chains:
            raise ValueError("No chains provided to SequentialChain")
        
        # Convert single chain to list
        if not isinstance(chains, list):
            chains = [chains]
        
        # Validate chains
        for i, chain in enumerate(chains):
            if not isinstance(chain, (LLMChain, Runnable)):
                raise ValueError(f"Chain at index {i} is not a valid chain object")
        
        # Create sequential chain
        sequential_chain = SequentialChain(
            chains=chains,
            input_variables=inputs.get("input_variables", ["input"]),
            output_variables=inputs.get("output_variables", ["output"]),
            return_all=inputs.get("return_all", False),
            verbose=True
        )
        
        return sequential_chain
