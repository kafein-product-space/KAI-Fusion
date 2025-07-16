.
|-- API_DOCUMENTATION.md
|-- app
|-- |-- __init__.py
|-- LICENSE
|-- DATABASE_SETUP_GUIDE.md
|-- .claude
|-- backend
|-- |-- WORKFLOW_ENGINE_GUIDE.md
|-- |-- test_react_workflow.py
|-- |-- app
|-- |-- |-- tasks
|-- |-- |-- |-- __init__.py
|-- |-- |-- |-- monitoring_tasks.py
|-- |-- |-- |-- workflow_tasks.py
|-- |-- |-- core
|-- |-- |-- |-- encryption.py
|-- |-- |-- |-- config.py
|-- |-- |-- |-- celery_app.py
|-- |-- |-- |-- auto_connector.py
|-- |-- |-- |-- database.py
|-- |-- |-- |-- security.py
|-- |-- |-- |-- checkpointer.py
|-- |-- |-- |-- __init__.py
|-- |-- |-- |-- __pycache__
|-- |-- |-- |-- credential_provider.py
|-- |-- |-- |-- node_discovery.py
|-- |-- |-- |-- exceptions.py
|-- |-- |-- |-- node_registry.py
|-- |-- |-- |-- graph_builder.py
|-- |-- |-- |-- engine_v2.py
|-- |-- |-- |-- state.py
|-- |-- |-- nodes
|-- |-- |-- |-- retrievers
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- chroma_retriever.py
|-- |-- |-- |-- tools
|-- |-- |-- |-- |-- google_search_tool.py
|-- |-- |-- |-- |-- wikipedia_tool.py
|-- |-- |-- |-- |-- arxiv_tool.py
|-- |-- |-- |-- |-- wolfram_alpha.py
|-- |-- |-- |-- |-- file_tools.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- web_browser.py
|-- |-- |-- |-- |-- tavily_search.py
|-- |-- |-- |-- |-- json_parser_tool.py
|-- |-- |-- |-- |-- requests_tool.py
|-- |-- |-- |-- embeddings
|-- |-- |-- |-- |-- cohere_embeddings.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- huggingface_embeddings.py
|-- |-- |-- |-- |-- openai_embeddings.py
|-- |-- |-- |-- memory
|-- |-- |-- |-- |-- buffer_memory.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- file_buffer_memory.py
|-- |-- |-- |-- |-- summary_memory.py
|-- |-- |-- |-- |-- conversation_memory.py
|-- |-- |-- |-- cache
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- in_memory_cache.py
|-- |-- |-- |-- |-- redis_cache.py
|-- |-- |-- |-- text_splitters
|-- |-- |-- |-- |-- token_splitter.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- character_splitter.py
|-- |-- |-- |-- |-- recursive_splitter.py
|-- |-- |-- |-- other
|-- |-- |-- |-- |-- condition_node.py
|-- |-- |-- |-- |-- generic_node.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- __init__.py
|-- |-- |-- |-- agents
|-- |-- |-- |-- |-- react_agent.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- __pycache__
|-- |-- |-- |-- special
|-- |-- |-- |-- |-- end_node.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- start_node.py
|-- |-- |-- |-- utilities
|-- |-- |-- |-- |-- text_formatter.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- calculator.py
|-- |-- |-- |-- vectorstores
|-- |-- |-- |-- |-- weaviate_vectorstore.py
|-- |-- |-- |-- |-- pinecone_vectorstore.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- faiss_vectorstore.py
|-- |-- |-- |-- |-- qdrant_vectorstore.py
|-- |-- |-- |-- output_parsers
|-- |-- |-- |-- |-- string_output_parser.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- pydantic_output_parser.py
|-- |-- |-- |-- prompts
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- agent_prompt.py
|-- |-- |-- |-- |-- prompt_template.py
|-- |-- |-- |-- document_loaders
|-- |-- |-- |-- |-- pdf_loader.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- web_loader.py
|-- |-- |-- |-- |-- text_loader.py
|-- |-- |-- |-- llms
|-- |-- |-- |-- |-- openai_node.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- gemini.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- anthropic_claude.py
|-- |-- |-- |-- chains
|-- |-- |-- |-- |-- conditional_chain.py
|-- |-- |-- |-- |-- llm_chain.py
|-- |-- |-- |-- |-- map_reduce_chain.py
|-- |-- |-- |-- |-- __init__.py
|-- |-- |-- |-- |-- __pycache__
|-- |-- |-- |-- |-- sequential_chain.py
|-- |-- |-- |-- base.py
|-- |-- |-- |-- test_node.py
|-- |-- |-- auth
|-- |-- |-- |-- __init__.py
|-- |-- |-- |-- __pycache__
|-- |-- |-- |-- dependencies.py
|-- |-- |-- .claude
|-- |-- |-- models
|-- |-- |-- |-- auth.py
|-- |-- |-- |-- user.py
|-- |-- |-- |-- execution.py
|-- |-- |-- |-- organization.py
|-- |-- |-- |-- __init__.py
|-- |-- |-- |-- __pycache__
|-- |-- |-- |-- api_key.py
|-- |-- |-- |-- user_credential.py
|-- |-- |-- |-- chat.py
|-- |-- |-- |-- workflow.py
|-- |-- |-- |-- node.py
|-- |-- |-- |-- base.py
|-- |-- |-- __pycache__
|-- |-- |-- schemas
|-- |-- |-- |-- auth.py
|-- |-- |-- |-- user.py
|-- |-- |-- |-- execution.py
|-- |-- |-- |-- organization.py
|-- |-- |-- |-- __pycache__
|-- |-- |-- |-- api_key.py
|-- |-- |-- |-- user_credential.py
|-- |-- |-- |-- chat.py
|-- |-- |-- |-- workflow.py
|-- |-- |-- api
|-- |-- |-- |-- auth.py
|-- |-- |-- |-- executions.py
|-- |-- |-- |-- users.py
|-- |-- |-- |-- credentials.py
|-- |-- |-- |-- __init__.py
|-- |-- |-- |-- __pycache__
|-- |-- |-- |-- api_key.py
|-- |-- |-- |-- schemas.py
|-- |-- |-- |-- workflows.py
|-- |-- |-- |-- nodes.py
|-- |-- |-- |-- auth.py.backup
|-- |-- |-- main.py
|-- |-- |-- services
|-- |-- |-- |-- execution_service.py
|-- |-- |-- |-- task_service.py
|-- |-- |-- |-- __init__.py
|-- |-- |-- |-- __pycache__
|-- |-- |-- |-- workflow_service.py
|-- |-- |-- |-- api_key_service.py
|-- |-- |-- |-- user_service.py
|-- |-- |-- |-- credential_service.py
|-- |-- |-- |-- base.py
|-- |-- |-- |-- dependencies.py
|-- |-- pytest.ini
|-- |-- requirements.txt
|-- |-- .pytest_cache
|-- |-- Dockerfile
|-- |-- __init__.py
|-- |-- STANDARDIZATION_REPORT.md
|-- |-- start.py
|-- |-- README.md
|-- |-- mypy.ini
|-- |-- .env
|-- |-- ruff.toml
|-- |-- scripts
|-- |-- |-- performance_monitor.py
|-- |-- |-- simple_performance_check.py
|-- |-- SYSTEM_STATUS.md
|-- |-- test_stream.html
|-- |-- REACT_AGENT_GUIDE.md
|-- |-- FRONTEND_BACKEND_INTEGRATION_REPORT.md
|-- README.md
|-- .gitignore
|-- scripts
|-- |-- database
|-- |-- |-- create_kai_fusion_schema.sql
|-- |-- |-- deploy_database.sh
|-- .github
|-- |-- workflows
|-- |-- |-- frontend-ci.yml
|-- |-- |-- backend-ci.yml
|-- .gitattributes
|-- tree.md
|-- PROJECT_DOCUMENTATION.md
|-- .git
|-- client
|-- |-- .react-router
|-- |-- app
|-- |-- |-- routes.ts
|-- |-- |-- types
|-- |-- |-- |-- api.ts
|-- |-- |-- test
|-- |-- |-- |-- setup.ts
|-- |-- |-- app.css
|-- |-- |-- stores
|-- |-- |-- |-- userCredential.ts
|-- |-- |-- |-- nodes.ts
|-- |-- |-- |-- workflow.ts
|-- |-- |-- |-- workflows.ts
|-- |-- |-- |-- chat.ts
|-- |-- |-- |-- organization.ts
|-- |-- |-- |-- execution.ts
|-- |-- |-- |-- user.ts
|-- |-- |-- |-- auth.ts
|-- |-- |-- components
|-- |-- |-- |-- nodes
|-- |-- |-- |-- |-- StartNode.tsx
|-- |-- |-- |-- |-- vector_stores
|-- |-- |-- |-- |-- |-- FaissVectorStoreNode.tsx
|-- |-- |-- |-- |-- |-- WeaviateVectorStoreNode.tsx
|-- |-- |-- |-- |-- |-- QdrantVectorStoreNode.tsx
|-- |-- |-- |-- |-- |-- PineconeVectorStoreNode.tsx
|-- |-- |-- |-- |-- retrievers
|-- |-- |-- |-- |-- |-- ChromaRetrieverNode.tsx
|-- |-- |-- |-- |-- tools
|-- |-- |-- |-- |-- |-- WebBrowserToolNode.tsx
|-- |-- |-- |-- |-- |-- GoogleSearchNode.tsx
|-- |-- |-- |-- |-- |-- RequestsPostToolNode.tsx
|-- |-- |-- |-- |-- |-- ArxivToolNode.tsx
|-- |-- |-- |-- |-- |-- FileToolNode.tsx
|-- |-- |-- |-- |-- |-- WolframAlphaToolNode.tsx
|-- |-- |-- |-- |-- |-- WikipediaToolNode.tsx
|-- |-- |-- |-- |-- |-- TavilySearchNode.tsx
|-- |-- |-- |-- |-- |-- RequestsGetToolNode.tsx
|-- |-- |-- |-- |-- |-- JSONParserToolNode.tsx
|-- |-- |-- |-- |-- |-- ReadFileToolNode.tsx
|-- |-- |-- |-- |-- embeddings
|-- |-- |-- |-- |-- |-- CohereEmbeddingsNode.tsx
|-- |-- |-- |-- |-- |-- HuggingFaceEmbeddingsNode.tsx
|-- |-- |-- |-- |-- |-- OpenAIEmbeddingsNode.tsx
|-- |-- |-- |-- |-- memory
|-- |-- |-- |-- |-- |-- BufferMemory.tsx
|-- |-- |-- |-- |-- |-- ConversationMemoryNode.tsx
|-- |-- |-- |-- |-- |-- SummaryMemoryNode.tsx
|-- |-- |-- |-- |-- cache
|-- |-- |-- |-- |-- |-- InMemoryCacheNode.tsx
|-- |-- |-- |-- |-- |-- RedisCacheNode.tsx
|-- |-- |-- |-- |-- text_splitters
|-- |-- |-- |-- |-- |-- RecursiveTextSplitterNode.tsx
|-- |-- |-- |-- |-- |-- TokenTextSplitterNode.tsx
|-- |-- |-- |-- |-- |-- CharacterTextSplitterNode.tsx
|-- |-- |-- |-- |-- other
|-- |-- |-- |-- |-- |-- ConditionNode.tsx
|-- |-- |-- |-- |-- |-- EndNode.tsx
|-- |-- |-- |-- |-- |-- GenericNode.tsx
|-- |-- |-- |-- |-- agents
|-- |-- |-- |-- |-- |-- ToolAgentNode.tsx
|-- |-- |-- |-- |-- special
|-- |-- |-- |-- |-- |-- EndNode.tsx
|-- |-- |-- |-- |-- utilities
|-- |-- |-- |-- |-- |-- TextFormatterNode.tsx
|-- |-- |-- |-- |-- |-- CalculatorNode.tsx
|-- |-- |-- |-- |-- output_parsers
|-- |-- |-- |-- |-- |-- PydanticOutputParserNode.tsx
|-- |-- |-- |-- |-- |-- StringOutputParserNode.tsx
|-- |-- |-- |-- |-- prompts
|-- |-- |-- |-- |-- |-- PromptTemplateNode.tsx
|-- |-- |-- |-- |-- |-- AgentPromptNode.tsx
|-- |-- |-- |-- |-- document_loaders
|-- |-- |-- |-- |-- |-- TextLoaderNode.tsx
|-- |-- |-- |-- |-- |-- PDFLoaderNode.tsx
|-- |-- |-- |-- |-- |-- WebLoaderNode.tsx
|-- |-- |-- |-- |-- llms
|-- |-- |-- |-- |-- |-- OpenAIChatNode.tsx
|-- |-- |-- |-- |-- |-- ClaudeNode.tsx
|-- |-- |-- |-- |-- |-- GeminiNode.tsx
|-- |-- |-- |-- |-- chains
|-- |-- |-- |-- |-- |-- SequentialChainNode.tsx
|-- |-- |-- |-- |-- |-- MapReduceChainNode.tsx
|-- |-- |-- |-- |-- |-- ConditionalChainNode.tsx
|-- |-- |-- |-- |-- |-- LLMChainNode.tsx
|-- |-- |-- |-- modals
|-- |-- |-- |-- |-- vector_stores
|-- |-- |-- |-- |-- |-- QdrantConfigModal.tsx
|-- |-- |-- |-- |-- |-- FaissVectorStoreConfigModal.tsx
|-- |-- |-- |-- |-- |-- PineconeConfigModal.tsx
|-- |-- |-- |-- |-- |-- WeaviateVectorStoreModal.tsx
|-- |-- |-- |-- |-- retrievers
|-- |-- |-- |-- |-- |-- ChromaRetrieverConfigModal.tsx
|-- |-- |-- |-- |-- tools
|-- |-- |-- |-- |-- |-- RequestsPostToolModal.tsx
|-- |-- |-- |-- |-- |-- GoogleSearchToolModal.tsx
|-- |-- |-- |-- |-- |-- ArxivToolConfigModal.tsx
|-- |-- |-- |-- |-- |-- RequestsGetToolModal.tsx
|-- |-- |-- |-- |-- |-- TavilySearchConfigModal.tsx
|-- |-- |-- |-- |-- |-- WebBrowserToolConfigModal.tsx
|-- |-- |-- |-- |-- |-- ReadFileToolConfigModal.tsx
|-- |-- |-- |-- |-- |-- FileToolConfigModal.tsx
|-- |-- |-- |-- |-- |-- WolframAlphaToolConfigModal.tsx
|-- |-- |-- |-- |-- |-- JSONParserToolModal.tsx
|-- |-- |-- |-- |-- |-- WikipediaToolConfigModal.tsx
|-- |-- |-- |-- |-- embeddings
|-- |-- |-- |-- |-- |-- OpenAIEmbeddingsModal.tsx
|-- |-- |-- |-- |-- |-- HuggingFaceEmbeddingsConfigModal.tsx
|-- |-- |-- |-- |-- |-- CohereEmbeddingsConfigModal.tsx
|-- |-- |-- |-- |-- memory
|-- |-- |-- |-- |-- |-- BufferMemoryConfigModal.tsx
|-- |-- |-- |-- |-- |-- ConversationMemoryConfigModal.tsx
|-- |-- |-- |-- |-- |-- SummaryMemoryConfigModal.tsx
|-- |-- |-- |-- |-- cache
|-- |-- |-- |-- |-- |-- InMemoryCacheModal.tsx
|-- |-- |-- |-- |-- |-- RedisCacheModal.tsx
|-- |-- |-- |-- |-- text_splitters
|-- |-- |-- |-- |-- |-- CharacterTextSplitterConfigModal.tsx
|-- |-- |-- |-- |-- |-- TokenTextSplitterConfigModal.tsx
|-- |-- |-- |-- |-- |-- RecursiveTextSplitterConfigModal.tsx
|-- |-- |-- |-- |-- other
|-- |-- |-- |-- |-- |-- ConditionConfigModal.tsx
|-- |-- |-- |-- |-- |-- StreamingModal.tsx
|-- |-- |-- |-- |-- StartNodeConfigModal.tsx
|-- |-- |-- |-- |-- agents
|-- |-- |-- |-- |-- |-- AgentConfigModal.tsx
|-- |-- |-- |-- |-- utilities
|-- |-- |-- |-- |-- |-- TextFormatterConfigModal.tsx
|-- |-- |-- |-- |-- |-- CalculatorConfigModal.tsx
|-- |-- |-- |-- |-- output_parsers
|-- |-- |-- |-- |-- |-- PydanticOutputParserConfigModal.tsx
|-- |-- |-- |-- |-- |-- StringOutputParserConfigModal.tsx
|-- |-- |-- |-- |-- prompts
|-- |-- |-- |-- |-- |-- PromptTemplateConfigModal.tsx
|-- |-- |-- |-- |-- |-- AgentPromptConfigModal.tsx
|-- |-- |-- |-- |-- document_loaders
|-- |-- |-- |-- |-- |-- YoutubeLoaderConfigModal.tsx
|-- |-- |-- |-- |-- |-- WebLoaderConfigModal.tsx
|-- |-- |-- |-- |-- |-- PDFLoaderConfigModal.tsx
|-- |-- |-- |-- |-- |-- TextLoaderModal.tsx
|-- |-- |-- |-- |-- llms
|-- |-- |-- |-- |-- |-- OpenAIChatModal.tsx
|-- |-- |-- |-- |-- |-- ClaudeConfigModal.tsx
|-- |-- |-- |-- |-- |-- GeminiConfigModal.tsx
|-- |-- |-- |-- |-- chains
|-- |-- |-- |-- |-- |-- RouterChainConfigModal.tsx
|-- |-- |-- |-- |-- |-- SequentialChainConfigModal.tsx
|-- |-- |-- |-- |-- |-- ConditionalChainConfigModal.tsx
|-- |-- |-- |-- |-- |-- LLMChainConfigModal.tsx
|-- |-- |-- |-- |-- |-- MapReduceChainConfigModal.tsx
|-- |-- |-- |-- canvas
|-- |-- |-- |-- |-- FlowCanvas.tsx
|-- |-- |-- |-- dashboard
|-- |-- |-- |-- |-- DashboardSidebar.tsx
|-- |-- |-- |-- common
|-- |-- |-- |-- |-- Navbar.tsx
|-- |-- |-- |-- |-- LoadingSpinner.tsx
|-- |-- |-- |-- |-- Sidebar.tsx
|-- |-- |-- |-- |-- DraggableNode.tsx
|-- |-- |-- |-- |-- ErrorBoundary.tsx
|-- |-- |-- |-- |-- CustomEdge.tsx
|-- |-- |-- |-- AuthGuard.tsx
|-- |-- |-- root.tsx
|-- |-- |-- lib
|-- |-- |-- |-- api-client.ts
|-- |-- |-- |-- useSSE.ts
|-- |-- |-- |-- config.ts
|-- |-- |-- routes
|-- |-- |-- |-- templates.tsx
|-- |-- |-- |-- workflows.tsx
|-- |-- |-- |-- variables.tsx
|-- |-- |-- |-- home.tsx
|-- |-- |-- |-- credentials.tsx
|-- |-- |-- |-- register.tsx
|-- |-- |-- |-- canvas.tsx
|-- |-- |-- |-- executions.tsx
|-- |-- |-- |-- signin.tsx
|-- |-- |-- services
|-- |-- |-- |-- nodes.ts
|-- |-- |-- |-- chatService.ts
|-- |-- |-- |-- workflows.ts
|-- |-- |-- |-- organizationService.ts
|-- |-- |-- |-- authService.ts
|-- |-- |-- |-- userCredentialService.ts
|-- |-- |-- |-- userService.ts
|-- |-- |-- |-- executionService.ts
|-- |-- |-- |-- workflowService.ts
|-- |-- Dockerfile
|-- |-- jest.config.js
|-- |-- react-router.config.ts
|-- |-- remove-unused-imports.js
|-- |-- node_modules
|-- |-- README.md
|-- |-- .dockerignore
|-- |-- .gitignore
|-- |-- package-lock.json
|-- |-- package.json
|-- |-- .eslintrc.js
|-- |-- tsconfig.json
|-- |-- GEMINI.md
|-- |-- build
|-- |-- .env.example
|-- |-- lighthouse.config.js
|-- |-- vite.config.ts
|-- |-- vitest.config.ts
|-- |-- src
|-- |-- |-- test
|-- |-- |-- |-- setup.ts
