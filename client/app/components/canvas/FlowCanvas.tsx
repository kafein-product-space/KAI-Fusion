import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import { useSnackbar } from "notistack";
import { useWorkflows } from "~/stores/workflows";
import { useNodes } from "~/stores/nodes";
import { useExecutionsStore } from "~/stores/executions";
import { useSmartSuggestions } from "~/stores/smartSuggestions";
import StartNode from "../nodes/StartNode";
import ToolAgentNode from "../nodes/agents/ToolAgent/index";

import OpenAIChatNode from "../nodes/llms/OpenAI/index";
import CustomEdge from "../common/CustomEdge";

import type {
  WorkflowData,
  WorkflowNode,
  WorkflowEdge,
  NodeMetadata,
} from "~/types/api";

import { Loader } from "lucide-react";
import ChatComponent from "./ChatComponent";
import ChatHistorySidebar from "./ChatHistorySidebar";
import SidebarToggleButton from "./SidebarToggleButton";
import ErrorDisplayComponent from "./ErrorDisplayComponent";
import ReactFlowCanvas from "./ReactFlowCanvas";

import OpenAIEmbeddingsNode from "../nodes/embeddings/OpenaiEmbeddingsNode/index";

import RedisCacheNode from "../nodes/cache/RedisCacheNode";
import ConditionalChainNode from "../nodes/chains/ConditionalChainNode";
import CohereEmbeddingsNode from "../nodes/embeddings/CohereEmbeddingsNode";
import BufferMemoryNode from "../nodes/memory/BufferMemory/index";
import TavilyWebSearchNode from "../nodes/tools/TavilyWebSearch";
import Navbar from "../common/Navbar";
import Sidebar from "../common/Sidebar";
import EndNode from "../nodes/special/EndNode";
import { useChatStore } from "../../stores/chat";
import RouterChainNode from "../nodes/chains/RouterChainNode";
import ConversationMemoryNode from "../nodes/memory/ConversationMemoryNode";
import TextLoaderNode from "../nodes/document_loaders/TextLoaderNode";
import WebScraperNode from "../nodes/document_loaders/WebScraper";
import DocumentLoaderNode from "../nodes/document_loaders/DocumentLoader/index";
import RetrievalQANode from "../nodes/chains/RetrievalQANode";
import OpenAIDocumentEmbedderNode from "../nodes/embeddings/OpenAIDocumentEmbedder";
import DocumentChunkSplitterNode from "../nodes/splitters/DocumentChunkSplitter";
import HTTPClientNode from "../nodes/tools/HTTPClient/index";
import DocumentRerankerNode from "../nodes/tools/DocumentReranker/index";
import TimerStartNode from "../nodes/triggers/TimerStartNode";
import WebhookTriggerNode from "../nodes/triggers/WebhookTrigger";
import PostgreSQLVectorStoreNode from "../nodes/vectorstores/PostgreSQLVectorStoreNode";
import OpenAIEmbeddingsProviderNode from "../nodes/embeddings/OpenAIEmbeddingsProvider";
import CohereRerankerNode from "../nodes/tools/CohereReranker/index";
import VectorStoreOrchestratorNode from "../nodes/vectorstores/VectorStoreOrchestrator/index";
import IntelligentVectorStoreNode from "../nodes/vectorstores/IntelligentVectorStoreNode";
import RetrieverNode from "../nodes/tools/RetrieverNode";
import UnsavedChangesModal from "../modals/UnsavedChangesModal";
import AutoSaveSettingsModal from "../modals/AutoSaveSettingsModal";

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
  TavilySearch: TavilyWebSearchNode,
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
  OpenAIEmbeddingsProvider: OpenAIEmbeddingsProviderNode,
  CohereRerankerProvider: CohereRerankerNode,
  VectorStoreOrchestrator: VectorStoreOrchestratorNode,
  RetrieverProvider: RetrieverNode,
  IntelligentVectorStore: IntelligentVectorStoreNode,
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
  const [activeNodes, setActiveNodes] = useState<string[]>([]);

  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30000); // 30 seconds
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Unsaved changes modal ref
  const unsavedChangesModalRef = useRef<HTMLDialogElement>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );

  // Auto-save settings modal ref
  const autoSaveSettingsModalRef = useRef<HTMLDialogElement>(null);

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
    deleteWorkflow,
  } = useWorkflows();

  const { nodes: availableNodes } = useNodes();

  // Smart suggestions integration
  const { setLastAddedNode, updateRecommendations } = useSmartSuggestions();

  // Execution store integration
  const {
    executeWorkflow,
    currentExecution,
    loading: executionLoading,
    error: executionError,
    clearError: clearExecutionError,
  } = useExecutionsStore();

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
    thinking: chatThinking, // thinking state'ini al
    error: chatError,
    addMessage,
    fetchChatMessages,
    loadChatHistory,
    clearAllChats,
  } = useChatStore();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);

  useEffect(() => {
    console.log("wokflowId", workflowId);
    if (workflowId) {
      // Tekil workflow'u doğrudan fetch et
      fetchWorkflow(workflowId).catch(() => {
        setCurrentWorkflow(null);
        clearAllChats(); // Clear chats when workflow loading fails
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
      clearAllChats(); // Clear chats for new workflow
    }
  }, [workflowId]);

  useEffect(() => {
    if (currentWorkflow?.name) {
      setWorkflowName(currentWorkflow.name);
    } else {
      setWorkflowName("isimsiz dosya");
    }
  }, [currentWorkflow?.name]);

  // Clear chats when workflow changes to prevent accumulation
  useEffect(() => {
    if (currentWorkflow?.id) {
      // Clear chats when switching to a different workflow
      clearAllChats();
    }
  }, [currentWorkflow?.id, clearAllChats]);

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

  // Load chat history on component mount
  useEffect(() => {
    if (currentWorkflow?.id) {
      // Load workflow-specific chats
      loadChatHistory();
    } else {
      // Clear chats when no workflow is selected (new workflow)
      clearAllChats();
    }
  }, [currentWorkflow?.id, loadChatHistory, clearAllChats]);

  // Load chat messages when active chat changes
  useEffect(() => {
    if (activeChatflowId) {
      fetchChatMessages(activeChatflowId);
    }
  }, [activeChatflowId, fetchChatMessages]);

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

      // Update smart suggestions with the last added node
      setLastAddedNode(nodeType.type);

      // Update recommendations after setting the last added node
      updateRecommendations(availableNodes);
    },
    [
      screenToFlowPosition,
      nodeId,
      availableNodes,
      setLastAddedNode,
      updateRecommendations,
    ]
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
        setHasUnsavedChanges(false); // Kaydetme başarılı olduğunda false yap
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
      setHasUnsavedChanges(false); // Kaydetme başarılı olduğunda false yap
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
    setHasUnsavedChanges,
    workflowName,
  ]);

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!autoSaveEnabled || !hasUnsavedChanges || !currentWorkflow) {
      return;
    }

    setAutoSaveStatus("saving");

    try {
      const flowData: WorkflowData = {
        nodes: nodes as WorkflowNode[],
        edges: edges as WorkflowEdge[],
      };

      await updateWorkflow(currentWorkflow.id, {
        name: workflowName,
        description: currentWorkflow.description,
        flow_data: flowData,
      });

      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
      setAutoSaveStatus("saved");

      // Show subtle notification
      enqueueSnackbar("Auto-saved", {
        variant: "success",
        autoHideDuration: 2000,
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Auto-save failed:", error);
      setAutoSaveStatus("error");

      enqueueSnackbar("Auto-save failed", {
        variant: "error",
        autoHideDuration: 3000,
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
      });

      // Reset error status after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 5000);
    }
  }, [
    autoSaveEnabled,
    hasUnsavedChanges,
    currentWorkflow,
    nodes,
    edges,
    updateWorkflow,
    workflowName,
    setHasUnsavedChanges,
    enqueueSnackbar,
  ]);

  // Auto-save timer effect
  useEffect(() => {
    if (!autoSaveEnabled || !currentWorkflow) {
      return;
    }

    const timer = setInterval(() => {
      if (hasUnsavedChanges) {
        handleAutoSave();
      }
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [
    autoSaveEnabled,
    autoSaveInterval,
    hasUnsavedChanges,
    currentWorkflow,
    handleAutoSave,
  ]);

  // Function to handle StartNode execution with proper service integration
  const handleStartNodeExecution = useCallback(
    async (nodeId: string) => {
      if (!currentWorkflow) {
        enqueueSnackbar("No workflow selected", { variant: "error" });
        return;
      }

      try {
        // Show loading message
        enqueueSnackbar("Executing workflow...", { variant: "info" });

        // Get the flow data
        const flowData: WorkflowData = {
          nodes: nodes as WorkflowNode[],
          edges: edges as WorkflowEdge[],
        };

        // Prepare execution inputs
        const executionData = {
          flow_data: flowData,
          input_text: "Start workflow execution",
          node_id: nodeId,
          execution_type: "manual",
          trigger_source: "start_node_double_click",
        };

        // Animate execution path before executing
        const executionPath = await animateExecutionPath(nodeId);

        // Clear animations after execution
        setTimeout(() => {
          setActiveEdges([]);
          setActiveNodes([]);
        }, 2000);

        // Use the execution service to execute workflow
        await executeWorkflow(currentWorkflow.id, executionData);

        // Show success message
        enqueueSnackbar("Workflow executed successfully", {
          variant: "success",
        });

        // Clear any previous execution errors
        clearExecutionError();
      } catch (error: any) {
        console.error("Error executing workflow:", error);
        enqueueSnackbar(`Error executing workflow: ${error.message}`, {
          variant: "error",
        });
      }
    },
    [
      currentWorkflow,
      nodes,
      edges,
      executeWorkflow,
      clearExecutionError,
      enqueueSnackbar,
      setActiveEdges,
    ]
  );

  // Monitor execution errors and show them
  useEffect(() => {
    if (executionError) {
      enqueueSnackbar(`Execution error: ${executionError}`, {
        variant: "error",
      });
      clearExecutionError();
    }
  }, [executionError, enqueueSnackbar, clearExecutionError]);

  // Monitor execution loading state
  useEffect(() => {
    if (executionLoading) {
      enqueueSnackbar("Executing workflow...", { variant: "info" });
    }
  }, [executionLoading, enqueueSnackbar]);

  // Monitor successful execution and show success message
  useEffect(() => {
    if (currentExecution && !executionLoading) {
      setShowSuccessMessage(true);
      // Clear success message after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentExecution, executionLoading]);

  // Use stable nodeTypes - pass handlers via node data instead
  const nodeTypes = useMemo(
    () => ({
      ...baseNodeTypes,
      StartNode: (props: any) => (
        <StartNode
          {...props}
          onExecute={handleStartNodeExecution}
          isExecuting={executionLoading}
          isActive={activeNodes.includes(props.id)}
        />
      ),
      OpenAIChat: (props: any) => (
        <OpenAIChatNode {...props} isActive={activeNodes.includes(props.id)} />
      ),
    }),
    [handleStartNodeExecution, executionLoading, activeNodes]
  );
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

  // Handle navigation after modal actions
  const handleNavigation = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  // Auto-save settings handler
  const handleAutoSaveSettings = useCallback(() => {
    autoSaveSettingsModalRef.current?.showModal();
  }, []);

  // Unsaved changes modal handlers
  const handleUnsavedChangesSave = useCallback(async () => {
    try {
      await handleSave();
      // Navigate to pending location after successful save
      if (pendingNavigation) {
        handleNavigation(pendingNavigation);
      }
    } catch (error) {
      enqueueSnackbar("Kaydetme başarısız oldu", { variant: "error" });
    }
  }, [handleSave, pendingNavigation, enqueueSnackbar, handleNavigation]);

  const handleUnsavedChangesDiscard = useCallback(() => {
    setHasUnsavedChanges(false);
    // Navigate to pending location
    if (pendingNavigation) {
      handleNavigation(pendingNavigation);
    }
  }, [setHasUnsavedChanges, pendingNavigation, handleNavigation]);

  const handleUnsavedChangesCancel = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  // Function to animate execution path
  const animateExecutionPath = useCallback(
    async (startNodeId: string) => {
      const visited = new Set<string>();
      const path: string[] = [];

      const traverse = async (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        // Add node to active nodes
        setActiveNodes([nodeId]);
        path.push(nodeId);

        // Wait a bit to show the node is active
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Find connected edges
        const connectedEdges = edges.filter((edge) => edge.source === nodeId);

        for (const edge of connectedEdges) {
          // Animate edge
          setActiveEdges([edge.id]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Traverse to target node
          await traverse(edge.target);
        }
      };

      await traverse(startNodeId);
      return path;
    },
    [edges]
  );

  // Function to check unsaved changes before navigation
  const checkUnsavedChanges = useCallback(
    (url: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(url);
        unsavedChangesModalRef.current?.showModal();
        return false;
      }
      return true;
    },
    [hasUnsavedChanges]
  );

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

  const handleShowHistory = () => {
    setChatHistoryOpen(true);
  };

  const handleSelectChat = (chatflowId: string) => {
    if (chatflowId === "") {
      // New chat
      setActiveChatflowId(null);
    } else {
      // Select existing chat
      setActiveChatflowId(chatflowId);
    }
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

  return (
    <>
      <Navbar
        workflowName={workflowName}
        setWorkflowName={setWorkflowName}
        onSave={handleSave}
        currentWorkflow={currentWorkflow}
        setCurrentWorkflow={setCurrentWorkflow}
        setNodes={setNodes}
        setEdges={setEdges}
        deleteWorkflow={deleteWorkflow}
        isLoading={isLoading}
        checkUnsavedChanges={checkUnsavedChanges}
        autoSaveStatus={autoSaveStatus}
        lastAutoSave={lastAutoSave}
        onAutoSaveSettings={handleAutoSaveSettings}
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
            onShowHistory={handleShowHistory}
            activeChatflowId={activeChatflowId}
            currentWorkflow={currentWorkflow}
            flowData={{
              nodes: nodes as WorkflowNode[],
              edges: edges as WorkflowEdge[],
            }}
            chatThinking={chatThinking}
          />

          {/* Chat History Sidebar */}
          <ChatHistorySidebar
            isOpen={chatHistoryOpen}
            onClose={() => setChatHistoryOpen(false)}
            onSelectChat={handleSelectChat}
            activeChatflowId={activeChatflowId}
            workflow_id={currentWorkflow?.id}
          />

          {/* Execution Status Indicator */}
          {executionLoading && (
            <div className="fixed top-20 right-5 z-50 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg flex items-center gap-2 animate-pulse">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Executing workflow...</span>
            </div>
          )}

          {/* Execution Error Display */}
          {executionError && (
            <div className="fixed top-20 right-5 z-50 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg flex items-center gap-2">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              <span className="text-sm font-medium">Execution failed</span>
            </div>
          )}

          {/* Execution Success Display */}
          {showSuccessMessage && currentExecution && !executionLoading && (
            <div className="fixed top-20 right-5 z-50 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-sm font-medium">Execution completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        ref={unsavedChangesModalRef}
        onSave={handleUnsavedChangesSave}
        onDiscard={handleUnsavedChangesDiscard}
        onCancel={handleUnsavedChangesCancel}
      />

      {/* Auto-save Settings Modal */}
      <AutoSaveSettingsModal
        ref={autoSaveSettingsModalRef}
        autoSaveEnabled={autoSaveEnabled}
        setAutoSaveEnabled={setAutoSaveEnabled}
        autoSaveInterval={autoSaveInterval}
        setAutoSaveInterval={setAutoSaveInterval}
        lastAutoSave={lastAutoSave}
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
