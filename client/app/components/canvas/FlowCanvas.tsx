import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import { useSnackbar } from "notistack";
import { useWorkflows } from "~/stores/workflows";
import { useNodes } from "~/stores/nodes";
import StartNode from "../nodes/StartNode";
import ToolAgentNode from "../nodes/agents/ToolAgentNode";

import OpenAIChatNode from "../nodes/llms/OpenAIChatNode";
import CustomEdge from "../common/CustomEdge";

import type {
  WorkflowData,
  WorkflowNode,
  WorkflowEdge,
  NodeMetadata,
} from "~/types/api";

import { Eraser, Save, Plus, Minus, Loader } from "lucide-react";
import ChatComponent from "./ChatComponent";
import TestButtonsComponent from "./TestButtonsComponent";
import SidebarToggleButton from "./SidebarToggleButton";
import ErrorDisplayComponent from "./ErrorDisplayComponent";
import ReactFlowCanvas from "./ReactFlowCanvas";

import OpenAIEmbeddingsNode from "../nodes/embeddings/OpenAIEmbeddingsNode";

import RedisCacheNode from "../nodes/cache/RedisCacheNode";
import ConditionalChainNode from "../nodes/chains/ConditionalChainNode";
import CohereEmbeddingsNode from "../nodes/embeddings/CohereEmbeddingsNode";
import BufferMemoryNode from "../nodes/memory/BufferMemory";
import TavilySearchNode from "../nodes/tools/TavilySearchNode";
import Navbar from "../common/Navbar";
import Sidebar from "../common/Sidebar";
import EndNode from "../nodes/special/EndNode";
import { useChatStore } from "../../stores/chat";
import RouterChainNode from "../nodes/chains/RouterChainNode";
import ConversationMemoryNode from "../nodes/memory/ConversationMemoryNode";
import TextLoaderNode from "../nodes/document_loaders/TextLoaderNode";
import ChatBubble from "../common/ChatBubble";
import WebScraperNode from "../nodes/document_loaders/WebScraperNode";
import DocumentLoaderNode from "../nodes/document_loaders/DocumentLoaderNode";
import RetrievalQANode from "../nodes/chains/RetrievalQANode";
import OpenAIDocumentEmbedderNode from "../nodes/embeddings/OpenAIDocumentEmbedderNode";
import DocumentChunkSplitterNode from "../nodes/splitters/DocumentChunkSplitterNode";
import HTTPClientNode from "../nodes/tools/HTTPClientNode";
import DocumentRerankerNode from "../nodes/tools/DocumentRerankerNode";
import TimerStartNode from "../nodes/triggers/TimerStartNode";
import WebhookTriggerNode from "../nodes/triggers/WebhookTriggerNode";
import PostgreSQLVectorStoreNode from "../nodes/vectorstores/PostgreSQLVectorStoreNode";

// Define nodeTypes outside component to prevent recreations
const baseNodeTypes = {
  Agent: ToolAgentNode,
  StartNode: StartNode,
  OpenAIChat: OpenAIChatNode,
  TextDataLoader: TextLoaderNode,
  OpenAIEmbeddings: OpenAIEmbeddingsNode,
  RedisCache: RedisCacheNode,
  ConditionalChain: ConditionalChainNode,
  CohereEmbeddings: CohereEmbeddingsNode,
  BufferMemory: BufferMemoryNode,
  ConversationMemory: ConversationMemoryNode,
  TavilySearch: TavilySearchNode,
  WebScraper: WebScraperNode,
  DocumentLoader: DocumentLoaderNode,
  EndNode: EndNode,
  RouterChain: RouterChainNode,
  RetrievalQA: RetrievalQANode,
  OpenAIEmbedder: OpenAIDocumentEmbedderNode,
  ChunkSplitter: DocumentChunkSplitterNode,
  HttpRequest: HTTPClientNode,
  Reranker: DocumentRerankerNode,
  TimerStartNode: TimerStartNode,
  WebhookTrigger: WebhookTriggerNode,
  PGVectorStore: PostgreSQLVectorStoreNode,
};

interface FlowCanvasProps {
  workflowId?: string;
}

interface ChatMessage {
  from: "user" | "bot";
  text: string;
  timestamp?: string;
  session_id?: string;
}

function FlowCanvas({ workflowId }: FlowCanvasProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodeId, setNodeId] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeEdges, setActiveEdges] = useState<string[]>([]);

  const {
    currentWorkflow,
    setCurrentWorkflow,
    isLoading,
    error,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    fetchWorkflows,
    updateWorkflow,
    createWorkflow,
    fetchWorkflow,
  } = useWorkflows();

  const { nodes: availableNodes } = useNodes();

  const [workflowName, setWorkflowName] = useState(
    currentWorkflow?.name || "isimsiz dosya"
  );

  const {
    chats,
    activeChatflowId,
    setActiveChatflowId,
    startLLMChat,
    sendLLMMessage,
    loading: chatLoading,
    error: chatError,
    addMessage,
  } = useChatStore();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    console.log("wokflowId", workflowId);
    if (workflowId) {
      // Tekil workflow'u doğrudan fetch et
      fetchWorkflow(workflowId).catch(() => {
        setCurrentWorkflow(null);
        enqueueSnackbar("Workflow bulunamadı veya yüklenemedi.", {
          variant: "error",
        });
      });
    } else {
      // Yeni workflow: state'i sıfırla
      setCurrentWorkflow(null);
      setNodes([]);
      setEdges([]);
      setWorkflowName("isimsiz dosya");
    }
  }, [workflowId]);

  useEffect(() => {
    if (currentWorkflow?.name) {
      setWorkflowName(currentWorkflow.name);
    } else {
      setWorkflowName("isimsiz dosya");
    }
  }, [currentWorkflow?.name]);

  useEffect(() => {
    if (currentWorkflow?.flow_data) {
      const { nodes, edges } = currentWorkflow.flow_data;
      setNodes(nodes || []);

      // Clean up invalid edges that reference non-existent nodes
      if (edges && nodes) {
        const nodeIds = new Set(nodes.map((n) => n.id));
        const validEdges = edges.filter(
          (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );

        // Log if any edges were cleaned up
        if (validEdges.length !== edges.length) {
          console.log(
            `🧹 Cleaned up ${edges.length - validEdges.length} invalid edges`
          );
        }

        setEdges(validEdges);
      } else {
        setEdges(edges || []);
      }
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentWorkflow]);

  useEffect(() => {
    if (currentWorkflow) {
      const currentFlowData: WorkflowData = {
        nodes: nodes as WorkflowNode[],
        edges: edges as WorkflowEdge[],
      };
      const originalFlowData = currentWorkflow.flow_data;
      const hasChanges =
        JSON.stringify(currentFlowData) !== JSON.stringify(originalFlowData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [nodes, edges, currentWorkflow]);

  // Clean up edges when nodes are deleted
  useEffect(() => {
    if (nodes.length > 0 && edges.length > 0) {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const validEdges = edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );

      if (validEdges.length !== edges.length) {
        console.log(
          `🧹 Auto-cleaned ${edges.length - validEdges.length} orphaned edges`
        );
        // Use callback to prevent infinite loop
        setEdges((prevEdges: Edge[]) => {
          if (prevEdges.length !== validEdges.length) {
            return validEdges;
          }
          return prevEdges;
        });
      }
    }
  }, [nodes]); // Only depend on nodes to prevent infinite loop

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds: Edge[]) => addEdge({ ...params, type: "custom" }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeTypeData = event.dataTransfer.getData("application/reactflow");

      if (!nodeTypeData) {
        return;
      }

      const nodeType = JSON.parse(nodeTypeData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeMetadata = availableNodes.find(
        (n: NodeMetadata) => n.name === nodeType.type
      );

      const newNode: Node = {
        id: `${nodeType.type}-${nodeId}`,
        type: nodeType.type,
        position,
        data: {
          name: nodeType.label,
          ...nodeType.data,
          metadata: nodeMetadata,
        },
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
      setNodeId((id: number) => id + 1);
    },
    [screenToFlowPosition, nodeId, availableNodes]
  );

  const handleSave = useCallback(async () => {
    const flowData: WorkflowData = {
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
    };

    if (!workflowName || workflowName.trim() === "") {
      enqueueSnackbar("Lütfen bir dosya adı girin.", { variant: "warning" });
      return;
    }

    if (!currentWorkflow) {
      try {
        const newWorkflow = await createWorkflow({
          name: workflowName,
          description: "",
          flow_data: flowData,
        });
        setCurrentWorkflow(newWorkflow);
        enqueueSnackbar(`Workflow "${workflowName}" created and saved!`, {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar("Failed to create workflow.", { variant: "error" });
      }
      return;
    }

    try {
      await updateWorkflow(currentWorkflow.id, {
        name: workflowName,
        description: currentWorkflow.description,
        flow_data: flowData,
      });
      enqueueSnackbar("Workflow saved successfully!", { variant: "success" });
    } catch (error) {
      console.error("Failed to save workflow:", error);
      enqueueSnackbar("Failed to save workflow.", { variant: "error" });
    }
  }, [
    currentWorkflow,
    nodes,
    edges,
    createWorkflow,
    updateWorkflow,
    enqueueSnackbar,
    setCurrentWorkflow,
    workflowName,
  ]);

  // Use stable nodeTypes - pass handlers via node data instead
  const nodeTypes = baseNodeTypes;
  const handleClear = useCallback(() => {
    if (hasUnsavedChanges) {
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to clear the canvas?"
        )
      ) {
        return;
      }
    }
    setNodes([]);
    setEdges([]);
    setCurrentWorkflow(null);
  }, [hasUnsavedChanges, setCurrentWorkflow]);

  // handleSendMessage fonksiyonu güncellendi
  const handleSendMessage = async () => {
    if (chatInput.trim() === "") return;
    const userMessage = chatInput;
    setChatInput("");

    const flowData: WorkflowData = {
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
    };

    try {
      if (!currentWorkflow) {
        enqueueSnackbar("Bir workflow seçili değil!", { variant: "warning" });
        return;
      }
      if (!activeChatflowId) {
        await startLLMChat(flowData, userMessage, currentWorkflow.id);
      } else {
        await sendLLMMessage(
          flowData,
          userMessage,
          activeChatflowId,
          currentWorkflow.id
        );
      }
    } catch (e: any) {
      // Hata mesajını chat'e ekle
      addMessage(activeChatflowId || "error", {
        id: crypto.randomUUID(),
        chatflow_id: activeChatflowId || "error",
        role: "assistant",
        content: e.message || "Bilinmeyen bir hata oluştu.",
        created_at: new Date().toISOString(),
      });
    }
  };

  // Chat geçmişini store'dan al
  const chatHistory = activeChatflowId ? chats[activeChatflowId] || [] : [];

  const handleClearChat = () => {
    setActiveChatflowId(null);
  };

  // Edge'leri render ederken CustomEdge'a isActive prop'u ilet
  const edgeTypes = useMemo(
    () => ({
      custom: (edgeProps: any) => (
        <CustomEdge
          {...edgeProps}
          isActive={activeEdges.includes(edgeProps.id)}
        />
      ),
    }),
    [activeEdges]
  );

  const executionPath = edges.map((e) => e.id); // Tüm edge'leri sırayla elektriklendir

  const animateExecution = async () => {
    for (const edgeId of executionPath) {
      setActiveEdges([edgeId]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setActiveEdges([]);
  };

  return (
    <>
      <Navbar
        workflowName={workflowName}
        setWorkflowName={setWorkflowName}
        onSave={handleSave}
        currentWorkflow={currentWorkflow}
        isLoading={isLoading}
      />
      <div className="w-full h-full relative pt-16 flex bg-black">
        {/* Sidebar Toggle Button */}
        <SidebarToggleButton
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        {/* Sidebar modal */}
        {isSidebarOpen && <Sidebar onClose={() => setIsSidebarOpen(false)} />}

        {/* Canvas alanı */}
        <div className="flex-1">
          {/* Error Display */}
          <ErrorDisplayComponent error={error} />

          {/* ReactFlow Canvas */}
          <ReactFlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes as any}
            edgeTypes={edgeTypes}
            activeEdges={activeEdges}
            reactFlowWrapper={reactFlowWrapper}
            onDrop={onDrop}
            onDragOver={onDragOver}
          />

          {/* Chat Toggle Button */}
          <button
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 backdrop-blur-sm border ${
              chatOpen
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-400/30 shadow-blue-500/25"
                : "bg-gray-900/80 text-gray-300 border-gray-700/50 hover:bg-gray-800/90 hover:border-gray-600/50 hover:text-white"
            }`}
            onClick={() => setChatOpen((v) => !v)}
          >
            <div className="relative">
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${
                  chatOpen ? "rotate-12" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l.8-3.2A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {chatOpen && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <span className="font-medium text-sm">Chat</span>
            {chatOpen && (
              <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
            )}
          </button>

          {/* Chat Component */}
          <ChatComponent
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            chatHistory={chatHistory}
            chatError={chatError}
            chatLoading={chatLoading}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
          />
        </div>
      </div>

      {/* Test Buttons Component */}
      <TestButtonsComponent
        edges={edges}
        setActiveEdges={setActiveEdges}
        animateExecution={animateExecution}
      />
    </>
  );
}

interface FlowCanvasWrapperProps {
  workflowId?: string;
}

function FlowCanvasWrapper({ workflowId }: FlowCanvasWrapperProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
export default FlowCanvasWrapper;
