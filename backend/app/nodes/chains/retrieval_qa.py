"""
RetrievalQA Node - Complete RAG Question-Answering Chain
──────────────────────────────────────────────────────────
• Input: retriever (from Reranker/PGVectorStore) + user question
• Process: Advanced RAG with custom prompts, streaming, conversation memory
• Output: AI-generated answer + source citations + comprehensive analytics
• Features: Multiple LLM models, custom prompts, streaming responses, evaluation
"""

from __future__ import annotations

import os
import time
import logging
from typing import Any, Dict, List, Optional, AsyncGenerator
from datetime import datetime

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# Available LLM models for RAG
RAG_LLM_MODELS = {
    "gpt-4o": {
        "name": "GPT-4o",
        "description": "Latest GPT-4 optimized model, best for complex reasoning",
        "max_tokens": 128000,
        "cost_per_1k_input": 0.0025,
        "cost_per_1k_output": 0.01,
        "recommended": True,
    },
    "gpt-4-turbo": {
        "name": "GPT-4 Turbo",
        "description": "Powerful GPT-4 with large context window",
        "max_tokens": 128000,
        "cost_per_1k_input": 0.01,
        "cost_per_1k_output": 0.03,
        "recommended": False,
    },
    "gpt-3.5-turbo": {
        "name": "GPT-3.5 Turbo",
        "description": "Fast and cost-effective for most RAG applications",
        "max_tokens": 16385,
        "cost_per_1k_input": 0.0005,
        "cost_per_1k_output": 0.0015,
        "recommended": True,
    },
}

# Pre-built RAG prompt templates
RAG_PROMPT_TEMPLATES = {
    "default": {
        "name": "Default RAG",
        "template": """Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context:
{context}

Question: {question}

Answer:""",
        "description": "Standard RAG prompt with context and question",
    },
    "detailed": {
        "name": "Detailed Analysis",
        "template": """You are an AI assistant that provides detailed, well-researched answers based on the given context. Analyze the provided information carefully and give a comprehensive response.

Context Information:
{context}

Question: {question}

Instructions:
1. Base your answer strictly on the provided context
2. If the context doesn't contain enough information, clearly state this
3. Provide specific details and examples from the context when possible
4. Structure your response clearly with main points
5. If applicable, mention any limitations or uncertainties

Detailed Answer:""",
        "description": "Comprehensive analysis with structured response",
    },
    "concise": {
        "name": "Concise & Direct",
        "template": """Based on the context below, provide a concise and direct answer to the question.

Context: {context}

Question: {question}

Concise Answer:""",
        "description": "Short, direct answers for quick responses",
    },
    "academic": {
        "name": "Academic Style",
        "template": """As an academic researcher, analyze the provided context and answer the question with scholarly rigor.

Research Context:
{context}

Research Question: {question}

Please provide an academic-style response that:
- Synthesizes information from the context
- Maintains objectivity and precision
- Acknowledges limitations in the available data
- Uses appropriate academic language

Academic Response:""",
        "description": "Scholarly responses with academic rigor",
    },
    "conversational": {
        "name": "Conversational",
        "template": """You're having a friendly conversation with someone who asked you a question. Use the context below to give them a helpful, conversational answer.

Here's what I know about this topic:
{context}

Their question: {question}

My response:""",
        "description": "Friendly, conversational tone for user engagement",
    },
}

class RAGEvaluator:
    """Evaluates RAG response quality and relevance."""
    
    @staticmethod
    def evaluate_response(question: str, context_docs: List[Document], 
                         answer: str) -> Dict[str, Any]:
        """Evaluate RAG response quality."""
        # Basic evaluation metrics
        evaluation = {
            "context_length": sum(len(doc.page_content) for doc in context_docs),
            "context_documents": len(context_docs),
            "answer_length": len(answer),
            "answer_word_count": len(answer.split()),
        }
        
        # Source coverage analysis
        if context_docs:
            sources = list(set(doc.metadata.get("source", "unknown") for doc in context_docs))
            evaluation["unique_sources"] = len(sources)
            evaluation["sources_list"] = sources[:10]  # Limit for display
        
        # Content quality heuristics
        evaluation["contains_uncertainty"] = any(phrase in answer.lower() for phrase in [
            "i don't know", "not sure", "unclear", "insufficient information"
        ])
        
        evaluation["has_specific_details"] = len([word for word in answer.split() if word.isdigit()]) > 0
        
        # Response completeness score (0-100)
        completeness_score = 50  # Base score
        if evaluation["answer_length"] > 100:
            completeness_score += 20
        if evaluation["unique_sources"] > 1:
            completeness_score += 15
        if evaluation["has_specific_details"]:
            completeness_score += 15
        
        evaluation["completeness_score"] = min(100, completeness_score)
        evaluation["quality_grade"] = RAGEvaluator._get_quality_grade(completeness_score)
        
        return evaluation
    
    @staticmethod
    def _get_quality_grade(score: int) -> str:
        """Convert score to letter grade."""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"

class RetrievalQANode(ProcessorNode):
    """
    Complete RAG question-answering node with advanced features.
    Combines retrieval with language generation for comprehensive answers.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "RetrievalQA",
            "display_name": "RAG Question Answering",
            "description": (
                "Complete RAG (Retrieval-Augmented Generation) system that answers "
                "questions using retrieved documents and advanced language models. "
                "Includes conversation memory, custom prompts, and response evaluation."
            ),
            "category": NodeCategory.CHAIN,
            "node_type": NodeType.PROCESSOR,
            "icon": "chat-bubble-left-right",
            "color": "#3b82f6",
            
            # Comprehensive input configuration
            "inputs": [
                NodeInput(
                    name="retriever",
                    type="retriever",
                    is_connection=True,
                    description="Document retriever (from Reranker or PGVectorStore)",
                    required=True,
                ),
                NodeInput(
                    name="question",
                    type="textarea",
                    description="Question to answer using retrieved documents",
                    required=True,
                ),
                
                # LLM Configuration
                NodeInput(
                    name="llm_model",
                    type="select",
                    description="Language model for generating answers",
                    choices=[
                        {
                            "value": model_id,
                            "label": f"{info['name']} {'⭐' if info['recommended'] else ''}",
                            "description": f"{info['description']} • Input: ${info['cost_per_1k_input']:.4f}/1K, Output: ${info['cost_per_1k_output']:.4f}/1K"
                        }
                        for model_id, info in RAG_LLM_MODELS.items()
                    ],
                    default="gpt-4o",
                    required=True,
                ),
                NodeInput(
                    name="openai_api_key",
                    type="password",
                    description="OpenAI API key (leave empty to use environment variable)",
                    required=False,
                    is_secret=True,
                ),
                
                # Prompt Configuration
                NodeInput(
                    name="prompt_template",
                    type="select",
                    description="Pre-built prompt template for RAG responses",
                    choices=[
                        {
                            "value": template_id,
                            "label": template_info["name"],
                            "description": template_info["description"]
                        }
                        for template_id, template_info in RAG_PROMPT_TEMPLATES.items()
                    ],
                    default="default",
                    required=False,
                ),
                NodeInput(
                    name="custom_prompt",
                    type="textarea",
                    description="Custom prompt template (overrides pre-built templates). Use {context} and {question} placeholders.",
                    required=False,
                ),
                
                # Generation Parameters
                NodeInput(
                    name="temperature",
                    type="slider",
                    description="Response creativity (0.0=deterministic, 1.0=creative)",
                    default=0.1,
                    min_value=0.0,
                    max_value=1.0,
                    step=0.1,
                    required=False,
                ),
                NodeInput(
                    name="max_tokens",
                    type="slider",
                    description="Maximum tokens in response",
                    default=1000,
                    min_value=100,
                    max_value=4000,
                    step=100,
                    required=False,
                ),
                
                # Memory and Context
                NodeInput(
                    name="enable_memory",
                    type="boolean",
                    description="Enable conversation memory for follow-up questions",
                    default=False,
                    required=False,
                ),
                NodeInput(
                    name="memory_window",
                    type="slider",
                    description="Number of previous exchanges to remember",
                    default=5,
                    min_value=1,
                    max_value=20,
                    step=1,
                    required=False,
                ),
                
                # Response Configuration
                NodeInput(
                    name="include_sources",
                    type="boolean",
                    description="Include source citations in the response",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="enable_streaming",
                    type="boolean",
                    description="Stream response tokens as they're generated",
                    default=False,
                    required=False,
                ),
                NodeInput(
                    name="enable_evaluation",
                    type="boolean",
                    description="Evaluate response quality and provide metrics",
                    default=True,
                    required=False,
                ),
            ],
            
            # Multiple outputs for comprehensive results
            "outputs": [
                NodeOutput(
                    name="answer",
                    type="str",
                    description="Generated answer to the question",
                ),
                NodeOutput(
                    name="sources",
                    type="list",
                    description="Source documents used for the answer",
                ),
                NodeOutput(
                    name="response_metadata",
                    type="dict",
                    description="Detailed response metadata and statistics",
                ),
                NodeOutput(
                    name="cost_analysis",
                    type="dict",
                    description="Cost breakdown for the RAG operation",
                ),
                NodeOutput(
                    name="evaluation_metrics",
                    type="dict",
                    description="Quality evaluation of the generated response",
                ),
            ],
        }
        
        # Conversation memory (optional)
        self._memory = None

    def _create_prompt_template(self, template_config: str, custom_prompt: Optional[str]) -> PromptTemplate:
        """Create prompt template based on configuration."""
        if custom_prompt and custom_prompt.strip():
            # Use custom prompt
            return PromptTemplate(
                template=custom_prompt,
                input_variables=["context", "question"]
            )
        else:
            # Use pre-built template
            template_info = RAG_PROMPT_TEMPLATES.get(template_config, RAG_PROMPT_TEMPLATES["default"])
            return PromptTemplate(
                template=template_info["template"],
                input_variables=["context", "question"]
            )

    def _setup_memory(self, enable_memory: bool, memory_window: int) -> Optional[ConversationBufferWindowMemory]:
        """Setup conversation memory if enabled."""
        if not enable_memory:
            return None
        
        if self._memory is None:
            self._memory = ConversationBufferWindowMemory(
                k=memory_window,
                memory_key="chat_history",
                return_messages=True
            )
        return self._memory

    def _format_sources(self, source_docs: List[Document], include_sources: bool) -> List[Dict[str, Any]]:
        """Format source documents for output."""
        if not include_sources:
            return []
        
        formatted_sources = []
        for i, doc in enumerate(source_docs, 1):
            source_info = {
                "index": i,
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "source": doc.metadata.get("source", "Unknown"),
                "metadata": {k: v for k, v in doc.metadata.items() if k not in ["embedding"]},
            }
            formatted_sources.append(source_info)
        
        return formatted_sources

    def _calculate_cost_analysis(self, model_id: str, prompt_tokens: int, 
                                completion_tokens: int) -> Dict[str, Any]:
        """Calculate cost analysis for the RAG operation."""
        model_info = RAG_LLM_MODELS[model_id]
        
        input_cost = (prompt_tokens / 1000) * model_info["cost_per_1k_input"]
        output_cost = (completion_tokens / 1000) * model_info["cost_per_1k_output"]
        total_cost = input_cost + output_cost
        
        return {
            "model_used": model_id,
            "model_display_name": model_info["name"],
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "input_cost": round(input_cost, 6),
            "output_cost": round(output_cost, 6),
            "total_cost": round(total_cost, 6),
            "cost_per_1k_input": model_info["cost_per_1k_input"],
            "cost_per_1k_output": model_info["cost_per_1k_output"],
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute RAG question-answering with comprehensive analytics.
        
        Args:
            inputs: User configuration from UI
            connected_nodes: Connected input nodes (should contain retriever)
            
        Returns:
            Dict with answer, sources, metadata, cost_analysis, and evaluation_metrics
        """
        start_time = time.time()
        logger.info("🔄 Starting RetrievalQA execution")
        
        # Extract retriever from connected nodes
        retriever = connected_nodes.get("retriever")
        if not retriever:
            raise ValueError("No retriever provided. Connect a Reranker or PGVectorStore.")
        
        # Get configuration
        question = inputs.get("question", "").strip()
        if not question:
            raise ValueError("Question is required for RAG processing.")
        
        model_id = inputs.get("llm_model", "gpt-4o")
        api_key = inputs.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OpenAI API key is required. Provide it in the node configuration "
                "or set OPENAI_API_KEY environment variable."
            )
        
        temperature = float(inputs.get("temperature", 0.1))
        max_tokens = int(inputs.get("max_tokens", 1000))
        enable_memory = inputs.get("enable_memory", False)
        memory_window = int(inputs.get("memory_window", 5))
        include_sources = inputs.get("include_sources", True)
        enable_evaluation = inputs.get("enable_evaluation", True)
        
        logger.info(f"⚙️ Configuration: {RAG_LLM_MODELS[model_id]['name']}, temp={temperature}, max_tokens={max_tokens}")
        
        try:
            # Setup LLM
            llm = ChatOpenAI(
                model=model_id,
                temperature=temperature,
                max_tokens=max_tokens,
                openai_api_key=api_key,
            )
            
            # Setup prompt template
            prompt_template = self._create_prompt_template(
                inputs.get("prompt_template", "default"),
                inputs.get("custom_prompt")
            )
            
            # Setup memory if enabled
            memory = self._setup_memory(enable_memory, memory_window)
            
            # Retrieve relevant documents
            logger.info(f"🔍 Retrieving documents for question: {question[:50]}...")
            relevant_docs = retriever.get_relevant_documents(question)
            
            if not relevant_docs:
                logger.warning("No relevant documents found for the question")
                return {
                    "answer": "I couldn't find any relevant information to answer your question.",
                    "sources": [],
                    "response_metadata": {
                        "question": question,
                        "documents_found": 0,
                        "processing_time": time.time() - start_time,
                        "error": "No relevant documents retrieved"
                    },
                    "cost_analysis": {"total_cost": 0},
                    "evaluation_metrics": {"quality_grade": "F"},
                }
            
            logger.info(f"📚 Found {len(relevant_docs)} relevant documents")
            
            # Prepare context from retrieved documents
            context = "\\n\\n".join([
                f"Source {i+1}: {doc.page_content}"
                for i, doc in enumerate(relevant_docs)
            ])
            
            # Generate response using RAG chain
            formatted_prompt = prompt_template.format(context=context, question=question)
            
            # Add memory context if enabled
            if memory:
                # Add current interaction to memory
                memory.chat_memory.add_user_message(question)
                
                # Get conversation history
                history = memory.chat_memory.messages
                if history:
                    history_text = "\\n".join([
                        f"{'Human' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}"
                        for msg in history[-memory_window*2:]  # Last N exchanges
                    ])
                    formatted_prompt = f"Conversation History:\\n{history_text}\\n\\n{formatted_prompt}"
            
            # Generate answer
            response = llm.invoke(formatted_prompt)
            answer = response.content
            
            # Add to memory if enabled
            if memory:
                memory.chat_memory.add_ai_message(answer)
            
            # Calculate token usage and costs
            # Note: This is an approximation - actual implementation would need token counting
            estimated_prompt_tokens = len(formatted_prompt.split()) * 1.3  # Rough estimate
            estimated_completion_tokens = len(answer.split()) * 1.3
            
            cost_analysis = self._calculate_cost_analysis(
                model_id, 
                int(estimated_prompt_tokens), 
                int(estimated_completion_tokens)
            )
            
            # Format sources
            sources = self._format_sources(relevant_docs, include_sources)
            
            # Prepare response metadata
            end_time = time.time()
            processing_time = end_time - start_time
            
            response_metadata = {
                "question": question,
                "model_used": RAG_LLM_MODELS[model_id]["name"],
                "documents_retrieved": len(relevant_docs),
                "context_length": len(context),
                "answer_length": len(answer),
                "processing_time_seconds": round(processing_time, 2),
                "temperature": temperature,
                "max_tokens": max_tokens,
                "memory_enabled": enable_memory,
                "timestamp": datetime.now().isoformat(),
            }
            
            # Evaluate response quality if enabled
            evaluation_metrics = {}
            if enable_evaluation:
                evaluation_metrics = RAGEvaluator.evaluate_response(
                    question, relevant_docs, answer
                )
            
            # Log success summary
            logger.info(
                f"✅ RetrievalQA completed: {len(answer)} chars generated from "
                f"{len(relevant_docs)} docs in {processing_time:.1f}s "
                f"(Quality: {evaluation_metrics.get('quality_grade', 'N/A')})"
            )
            
            return {
                "answer": answer,
                "sources": sources,
                "response_metadata": response_metadata,
                "cost_analysis": cost_analysis,
                "evaluation_metrics": evaluation_metrics,
            }
            
        except Exception as e:
            error_msg = f"RetrievalQA execution failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Export for node registry
__all__ = ["RetrievalQANode"]