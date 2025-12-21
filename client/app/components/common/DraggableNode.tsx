import React from "react";
import type { ReactElement } from "react";
import {
  Archive,
  Bot,
  FileText,
  GitBranch,
  GitCompare,
  Globe,
  MessageCircle,
  Play,
  Square,
  Zap,
  Link,
  Send,
  Scissors,
  Search,
  Network,
  BookOpen,
  Type,
  Box,
} from "lucide-react";

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

const nodeTypeIconMap: Record<string, ReactElement> = {
  // 🔄 Akış Kontrol
  StartNode: <Play className="w-6 h-6 text-green-400" />,
  start: <Play className="w-6 h-6 text-green-400" />,
  TimerStart: <Zap className="w-6 h-6 text-yellow-400" />,
  EndNode: <Square className="w-6 h-6 text-gray-400" />,
  ConditionalChain: <GitCompare className="w-6 h-6 text-orange-400" />,
  RouterChain: <GitBranch className="w-6 h-6 text-lime-400" />,

  // 🤖 AI & Embedding
  Agent: <Bot className="w-6 h-6 text-blue-400" />,
  CohereEmbeddings: (
    <img src="icons/cohere.svg" alt="cohereicons" className="w-20 h-20" />
  ),
  OpenAIEmbedder: (
    <img src="icons/openai.svg" alt="openaiicons" className="w-20 h-20" />
  ),

  // 🧠 Hafıza
  BufferMemory: <Archive className="w-6 h-6 text-rose-400" />,
  ConversationMemory: <MessageCircle className="w-6 h-6 text-rose-300" />,

  // 📄 Belgeler & Veri
  TextDataLoader: <FileText className="w-6 h-6 text-pink-400" />,
  DocumentLoader: <FileText className="w-6 h-6 text-blue-400" />,
  ChunkSplitter: <Scissors className="w-6 h-6 text-pink-300" />,
  StringInputNode: <Type className="w-6 h-6 text-blue-400" />,
  PGVectorStore: (
    <img
      src="icons/postgresql_vectorstore.svg"
      alt="postgresqlvectorstoreicons"
      className="w-20 h-20"
    />
  ),
  VectorStoreOrchestrator: (
    <img
      src="icons/postgresql_vectorstore.svg"
      alt="postgresqlvectorstoreicons"
      className="w-20 h-20"
    />
  ),
  IntelligentVectorStore: (
    <img
      src="icons/postgresql_vectorstore.svg"
      alt="postgresqlvectorstoreicons"
      className="w-20 h-20"
    />
  ),

  // 🌐 Web & API
  TavilySearch: (
    <img
      src="icons/tavily-nonbrand.svg"
      alt="tavilysearchicons"
      className="w-10 h-10"
    />
  ),
  WebScraper: <Globe className="w-6 h-6 text-blue-400" />,
  HttpRequest: <Network className="w-6 h-6 text-blue-400" />,
  WebhookTrigger: <Link className="w-6 h-6 text-emerald-400" />,

  // 🧩 RAG & QA
  RetrievalQA: <BookOpen className="w-6 h-6 text-purple-400" />,
  Reranker: (
    <img
      src="icons/cohere.svg"
      alt="coherererankericons"
      className="w-20 h-20"
    />
  ),
  CohereRerankerProvider: (
    <img
      src="icons/cohere.svg"
      alt="coherererankericons"
      className="w-20 h-20"
    />
  ),
  RetrieverProvider: <Search className="w-6 h-6 text-indigo-400" />,
  RetrieverNode: <Search className="w-6 h-6 text-indigo-400" />,
  OpenAIEmbeddingsProvider: (
    <img
      src="icons/openai.svg"
      alt="openaiembeddingsprovidericons"
      className="w-20 h-20"
    />
  ),

  // ✅ SVG İkonları
  OpenAIChat: (
    <img src="icons/openai.svg" alt="openaichaticons" className="w-20 h-20" />
  ),

  OpenAIEmbeddings: (
    <img
      src="icons/openai.svg"
      alt="openaiembeddingsicons"
      className="w-20 h-20"
    />
  ),

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
      <div className="flex items-center m-2 p-2 rounded-3xl  ">
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
