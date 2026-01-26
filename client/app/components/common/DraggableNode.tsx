import React from "react";
import type { ReactElement } from "react";
import { Box } from "lucide-react";

interface NodeType {
  id: string;
  type: string;
  name: string;
  display_name: string;
  data: any;
  info: string;
}

interface DraggableNodeProps {
  nodeType: NodeType;
  icon: string;
}

// Icon size is controlled by the container, not individual img elements
// Fixed icon size - all icons will fit within this container
const ICON_CONTAINER_SIZE = "w-8 h-8";
const nodeTypeIconMap: Record<string, ReactElement> = {
  // Flow Control
  StartNode: <img src="icons/rocket.svg" alt="start" />,
  start: <img src="icons/rocket.svg" alt="start" />,
  TimerStart: <img src="icons/clock.svg" alt="timer" />,
  EndNode: <img src="icons/flag.svg" alt="end" />,
  ConditionalChain: <img src="icons/git-compare.svg" alt="conditional" />,
  RouterChain: <img src="icons/git-branch.svg" alt="router" />,

  // AI & Embedding
  Agent: <img src="icons/bot.svg" alt="agent" />,
  CohereEmbeddings: <img src="icons/cohere.svg" alt="cohere" />,
  OpenAIEmbedder: <img src="icons/openai.svg" alt="openai" />,

  // Memory
  BufferMemory: <img src="icons/database.svg" alt="buffer-memory" />,
  ConversationMemory: <img src="icons/message-circle.svg" alt="conversation-memory" />,

  // Documents & Data
  TextDataLoader: <img src="icons/file-text.svg" alt="text-loader" />,
  DocumentLoader: <img src="icons/file-input.svg" alt="document-loader" />,
  ChunkSplitter: <img src="icons/scissors.svg" alt="chunk-splitter" />,
  StringInputNode: <img src="icons/type.svg" alt="string-input" />,
  PGVectorStore: <img src="icons/postgresql_vectorstore.svg" alt="pg-vectorstore" />,
  VectorStoreOrchestrator: <img src="icons/postgresql_vectorstore.svg" alt="vectorstore-orchestrator" />,
  IntelligentVectorStore: <img src="icons/postgresql_vectorstore.svg" alt="intelligent-vectorstore" />,

  // Web & API
  TavilySearch: <img src="icons/tavily-nonbrand.svg" alt="tavily-search" />,
  WebScraper: <img src="icons/pickaxe.svg" alt="web-scraper" />,
  HttpRequest: <img src="icons/globe.svg" alt="http-request" />,
  WebhookTrigger: <img src="icons/webhook.svg" alt="webhook" />,

  // RAG & QA
  RetrievalQA: <img src="icons/book-open.svg" alt="retrieval-qa" />,
  Reranker: <img src="icons/cohere.svg" alt="reranker" />,
  CohereRerankerProvider: <img src="icons/cohere.svg" alt="cohere-reranker" />,
  RetrieverProvider: <img src="icons/file-stack.svg" alt="retriever-provider" />,
  RetrieverNode: <img src="icons/search.svg" alt="retriever-node" />,
  OpenAIEmbeddingsProvider: <img src="icons/openai.svg" alt="openai-embeddings-provider" />,

  // LLM Providers
  OpenAICompatibleNode: <img src="icons/openai.svg" alt="openai-compatible" />,
  OpenAIChat: <img src="icons/openai.svg" alt="openai-chat" />,
  OpenAIEmbeddings: <img src="icons/openai.svg" alt="openai-embeddings" />,

  // Processing Nodes
  CodeNode: <img src="icons/code.svg" alt="code-node" />,
  ConditionNode: <img src="icons/condition.svg" alt="condition-node" />,


  RedisCache: (
    <svg
      width="25px"
      height="25px"
      viewBox="0 -18 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M245.97 168.943c-13.662 7.121-84.434 36.22-99.501 44.075-15.067 7.856-23.437 7.78-35.34 2.09-11.902-5.69-87.216-36.112-100.783-42.597C3.566 169.271 0 166.535 0 163.951v-25.876s98.05-21.345 113.879-27.024c15.828-5.679 21.32-5.884 34.79-.95 13.472 4.936 94.018 19.468 107.331 24.344l-.006 25.51c.002 2.558-3.07 5.364-10.024 8.988"
        fill="#ef4444"
      />
      <path
        d="M185.295 35.998l34.836 13.766-34.806 13.753-.03-27.52"
        fill="#dc2626"
      />
      <path
        d="M146.755 51.243l38.54-15.245.03 27.519-3.779 1.478-34.791-13.752"
        fill="#f87171"
      />
    </svg>
  ),
  GenericNode: <Box className="w-6 h-6 text-blue-400" />,
};


function DraggableNode({ nodeType, icon }: DraggableNodeProps) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify(nodeType)
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="text-gray-100 flex items-center gap-2 p-3 hover:bg-gray-700/50 transition-all select-none cursor-grab rounded-2xl border border-transparent hover:border-gray-600"
    >
      <div className={`flex items-center justify-center ${ICON_CONTAINER_SIZE} m-2 shrink-0 [&>img]:max-w-full [&>img]:max-h-full [&>img]:object-contain`}>
        {nodeTypeIconMap[nodeType.type] || <></>}
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-md font-medium text-gray-200">
            {nodeType.display_name ||
              nodeType.data?.displayName ||
              nodeType.name}
          </h2>
        </div>
        <div>
          <p className="text-xs text-gray-400">{nodeType.info}</p>
        </div>
      </div>
    </div>
  );
}

export default DraggableNode;