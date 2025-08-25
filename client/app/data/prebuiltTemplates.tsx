import React from "react";
import { MessageSquare, BarChart3, Search, LifeBuoy } from "lucide-react";

export const prebuiltTemplates = [
  {
    id: "basic_agent",
    name: "Basic Agent",
    description:
      "AI Agent with OpenAI LLM for intelligent conversations and task execution. Includes StartNode → OpenAI Chat → Agent → EndNode workflow.",
    colorFrom: "from-blue-500",
    colorTo: "to-cyan-600",
    icon: <MessageSquare className="w-5 h-5 text-white" />,
    buildFlow: () => {
      const nodes = [
        {
          id: "StartNode-3",
          type: "StartNode",
          position: { x: 350, y: 280 },
          data: {
            name: "Start",
            initial_input: "",
          },
        },
        {
          id: "OpenAIChat-5",
          type: "OpenAIChat",
          position: { x: 350, y: 510 },
          data: {
            name: "OpenAI GPT",
            model_name: "gpt-4o",
            temperature: 0.1,
            max_tokens: 10000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            system_prompt:
              "You are a helpful, accurate, and intelligent AI assistant.",
            streaming: false,
            timeout: 60,
          },
        },
        {
          id: "Agent-2",
          type: "Agent",
          position: { x: 600, y: 250 },
          data: {
            name: "Agent",
            agent_type: "react",
            description:
              "Orchestrates LLM, tools, and memory for complex, multi-step tasks.",
            displayName: "Agent",
            temperature: 0.7,
            enable_tools: true,
            enable_memory: true,
            system_prompt:
              "You are a helpful assistant. Use tools to answer: {input}",
            max_iterations: 5,
          },
        },
        {
          id: "EndNode-4",
          type: "EndNode",
          position: { x: 900, y: 270 },
          data: {
            name: "End",
          },
        },
      ];
      const edges = [
        {
          id: "xy-edge__StartNode-3output-Agent-2start",
          type: "custom",
          source: "StartNode-3",
          target: "Agent-2",
          sourceHandle: "output",
          targetHandle: "start",
        },
        {
          id: "xy-edge__OpenAIChat-5output-Agent-2llm",
          type: "custom",
          source: "OpenAIChat-5",
          target: "Agent-2",
          sourceHandle: "output",
          targetHandle: "llm",
        },
        {
          id: "xy-edge__Agent-2output-EndNode-4target",
          type: "custom",
          source: "Agent-2",
          target: "EndNode-4",
          sourceHandle: "output",
          targetHandle: "target",
        },
      ];
      return { nodes, edges };
    },
  },
  {
    id: "rag_pipeline",
    name: "RAG Pipeline",
    description:
      "Complete RAG architecture with web scraping, document chunking, embeddings, and vector storage. Ready for intelligent document retrieval and Q&A.",
    colorFrom: "from-emerald-500",
    colorTo: "to-teal-600",
    icon: <BarChart3 className="w-5 h-5 text-white" />,
    buildFlow: () => {
      const nodes = [
        {
          id: "StartNode-1",
          type: "StartNode",
          position: { x: 100, y: -320 },
          data: {
            name: "Start",
            initial_input: "",
          },
        },
        {
          id: "WebScraper-1",
          type: "WebScraper",
          position: { x: 350, y: -320 },
          data: {
            name: "Web Scraper",
            urls: "https://example.com/page1, https://example.com/page2",
            user_agent:
              "Mozilla/5.0 (compatible; KAI-Fusion/2.1.0; Web-Scraper)",
            remove_selectors:
              "nav,footer,header,script,style,aside,noscript,form",
            min_content_length: 100,
          },
        },
        {
          id: "ChunkSplitter-3",
          type: "ChunkSplitter",
          position: { x: 600, y: -340 },
          data: {
            name: "Document Chunk Splitter",
            split_strategy: "recursive_character",
            chunk_size: 1000,
            chunk_overlap: 200,
            separators: "\\n\\n,\\n, ,.",
            header_levels: "h1,h2,h3",
            keep_separator: false,
            strip_whitespace: true,
            length_function: "len",
          },
        },
        {
          id: "OpenAIEmbeddingsProvider-1",
          type: "OpenAIEmbeddingsProvider",
          position: { x: 600, y: -80 },
          data: {
            name: "OpenAI Embeddings Provider",
            model: "text-embedding-3-small",
            request_timeout: 60,
            max_retries: 3,
          },
        },
        {
          id: "VectorStoreOrchestrator-4",
          type: "VectorStoreOrchestrator",
          position: { x: 850, y: -340 },
          data: {
            name: "Vector Store Orchestrator",
            connection_string: "",
            collection_name: "",
            table_prefix: "",
            pre_delete_collection: false,
            custom_metadata: "{}",
            preserve_document_metadata: true,
            metadata_strategy: "merge",
            auto_optimize: true,
            embedding_dimension: 0,
            search_algorithm: "cosine",
            search_k: 6,
            score_threshold: 0,
            batch_size: 100,
          },
        },
        {
          id: "EndNode-6",
          type: "EndNode",
          position: { x: 1100, y: -210 },
          data: {
            name: "End",
          },
        },
      ];
      const edges = [
        {
          id: "xy-edge__StartNode-1output-WebScraper-1execute",
          type: "custom",
          source: "StartNode-1",
          target: "WebScraper-1",
          sourceHandle: "output",
          targetHandle: "execute",
        },
        {
          id: "xy-edge__WebScraper-1documents-ChunkSplitter-3documents",
          type: "custom",
          source: "WebScraper-1",
          target: "ChunkSplitter-3",
          sourceHandle: "documents",
          targetHandle: "documents",
        },
        {
          id: "xy-edge__ChunkSplitter-3chunks-VectorStoreOrchestrator-4documents",
          type: "custom",
          source: "ChunkSplitter-3",
          target: "VectorStoreOrchestrator-4",
          sourceHandle: "chunks",
          targetHandle: "documents",
        },
        {
          id: "xy-edge__OpenAIEmbeddingsProvider-1embeddings-VectorStoreOrchestrator-4embedder",
          type: "custom",
          source: "OpenAIEmbeddingsProvider-1",
          target: "VectorStoreOrchestrator-4",
          sourceHandle: "embeddings",
          targetHandle: "embedder",
        },
        {
          id: "xy-edge__VectorStoreOrchestrator-4retriever-EndNode-6target",
          type: "custom",
          source: "VectorStoreOrchestrator-4",
          target: "EndNode-6",
          sourceHandle: "retriever",
          targetHandle: "target",
        },
      ];
      return { nodes, edges };
    },
  },
  {
    id: "rag_usage",
    name: "RAG Usage Flow",
    description:
      "Complete RAG architecture with OpenAI LLM, embeddings, vector retrieval, and intelligent agent for document-based Q&A.",
    colorFrom: "from-indigo-500",
    colorTo: "to-purple-600",
    icon: <Search className="w-5 h-5 text-white" />,
    buildFlow: () => {
      const nodes = [
        {
          id: "StartNode-1",
          type: "StartNode",
          position: { x: 650, y: -350 },
          data: { name: "Start" },
        },
        {
          id: "OpenAIChat-1",
          type: "OpenAIChat",
          position: { x: 750, y: -150 },
          data: {
            name: "OpenAI GPT",
            model_name: "gpt-4o",
            temperature: 0.7,
            max_tokens: 1000,
            system_prompt:
              "You are a helpful, accurate, and intelligent AI assistant.",
          },
        },
        {
          id: "OpenAIEmbeddingsProvider-1",
          type: "OpenAIEmbeddingsProvider",
          position: { x: 600, y: -10 },
          data: {
            name: "OpenAI Embeddings",
            model: "text-embedding-3-small",
            max_retries: 3,
            request_timeout: 60,
          },
        },
        {
          id: "CohereRerankerProvider-7",
          type: "CohereRerankerProvider",
          position: { x: 600, y: 110 },
          data: {
            name: "Cohere Reranker",
            model: "rerank-english-v3.0",
            top_n: 5,
          },
        },
        {
          id: "RetrieverProvider-6",
          type: "RetrieverProvider",
          position: { x: 900, y: 10 },
          data: {
            name: "Retriever Provider",
            database_connection: "",
            collection_name: "",
            search_k: 6,
            search_type: "similarity",
            score_threshold: 0.1,
            enable_metadata_filtering: false,
          },
        },
        {
          id: "BufferMemory-3",
          type: "BufferMemory",
          position: { x: 950, y: -130 },
          data: {
            name: "Buffer Memory",
            memory_key: "memory",
            return_messages: true,
            input_key: "input",
            output_key: "output",
          },
        },
        {
          id: "Agent-2",
          type: "Agent",
          position: { x: 1000, y: -387 },
          data: {
            name: "Agent",
            max_iterations: 5,
            system_prompt:
              "You are a helpful AI assistant with access to document retrieval tools.",
            prompt_instructions: "",
          },
        },
        {
          id: "EndNode-5",
          type: "EndNode",
          position: { x: 1200, y: -370 },
          data: { name: "End" },
        },
      ];

      const edges = [
        {
          id: "e_start_agent",
          type: "custom",
          source: "StartNode-1",
          target: "Agent-2",
          sourceHandle: "output",
          targetHandle: "start",
        },
        {
          id: "e_memory_agent",
          type: "custom",
          source: "BufferMemory-3",
          target: "Agent-2",
          sourceHandle: "output",
          targetHandle: "memory",
        },
        {
          id: "e_agent_end",
          type: "custom",
          source: "Agent-2",
          target: "EndNode-5",
          sourceHandle: "output",
          targetHandle: "target",
        },
        {
          id: "e_retriever_agent",
          type: "custom",
          source: "RetrieverProvider-6",
          target: "Agent-2",
          sourceHandle: "retriever_tool",
          targetHandle: "tools",
        },
        {
          id: "e_reranker_retriever",
          type: "custom",
          source: "CohereRerankerProvider-7",
          target: "RetrieverProvider-6",
          sourceHandle: "output",
          targetHandle: "reranker",
        },
        {
          id: "e_embeddings_retriever",
          type: "custom",
          source: "OpenAIEmbeddingsProvider-1",
          target: "RetrieverProvider-6",
          sourceHandle: "embeddings",
          targetHandle: "embedder",
        },
        {
          id: "e_oai_agent",
          type: "custom",
          source: "OpenAIChat-1",
          target: "Agent-2",
          sourceHandle: "output",
          targetHandle: "llm",
        },
      ];

      return { nodes, edges };
    },
  },
] as const;

export type PrebuiltTemplate = (typeof prebuiltTemplates)[number];
