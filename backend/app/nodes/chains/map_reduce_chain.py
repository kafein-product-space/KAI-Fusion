from typing import Dict, Any, List
from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from langchain.chains import MapReduceDocumentsChain, ReduceDocumentsChain, StuffDocumentsChain
from langchain.chains.llm import LLMChain
from langchain_core.language_models import BaseLanguageModel
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import Runnable

class MapReduceChainNode(ProcessorNode):
    """Map-reduce chain for processing multiple documents"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "MapReduceChain",
            "display_name": "Map Reduce Chain",

            "description": "Process multiple documents with map-reduce pattern",
            "category": "Chains",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="llm", type="llm", description="Language model", is_connection=True, required=True),
                NodeInput(name="map_prompt", type="str", description="Prompt for mapping phase", 
                         default="Summarize this content:\n\n{context}"),
                NodeInput(name="reduce_prompt", type="str", description="Prompt for reduce phase",
                         default="Combine these summaries:\n\n{context}"),
                NodeInput(name="document_variable_name", type="str", description="Variable name for documents", default="context"),
            ],
            "outputs": [
                NodeOutput(name="output", type="chain", description="Map-reduce chain")
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute map-reduce chain node"""
        llm = connected_nodes.get("llm")
        if not isinstance(llm, BaseLanguageModel):
            raise ValueError("LLM connection is required")
        
        # Map chain
        map_prompt = PromptTemplate.from_template(inputs.get("map_prompt", "Summarize:\n\n{context}"))
        map_chain = LLMChain(llm=llm, prompt=map_prompt)
        
        # Reduce chain
        reduce_prompt = PromptTemplate.from_template(inputs.get("reduce_prompt", "Combine:\n\n{context}"))
        reduce_chain = LLMChain(llm=llm, prompt=reduce_prompt)
        
        # Combine documents chain
        combine_documents_chain = StuffDocumentsChain(
            llm_chain=reduce_chain,
            document_variable_name=inputs.get("document_variable_name", "context")
        )
        
        # Reduce documents chain
        reduce_documents_chain = ReduceDocumentsChain(
            combine_documents_chain=combine_documents_chain,
            collapse_documents_chain=combine_documents_chain,
            token_max=4000,
        )
        
        # Map reduce chain
        return MapReduceDocumentsChain(
            llm_chain=map_chain,
            reduce_documents_chain=reduce_documents_chain,
            document_variable_name=inputs.get("document_variable_name", "context"),
            return_intermediate_steps=False,
        )
