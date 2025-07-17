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
import LLMChainNode from "../nodes/chains/LLMChainNode";
import OpenAIChatNode from "../nodes/llms/OpenAIChatNode";
import CustomEdge from "../common/CustomEdge";
import StreamingModal from "../modals/other/StreamingModal";

import type {
  WorkflowData,
  WorkflowNode,
  WorkflowEdge,
  NodeMetadata,
} from "~/types/api";
import WorkflowService from "~/services/workflows";
import { Eraser, Save, Plus, Minus } from "lucide-react";
import TextLoaderNode from "../nodes/document_loaders/TextLoaderNode";
import OpenAIEmbeddingsNode from "../nodes/embeddings/OpenAIEmbeddingsNode";
import InMemoryCacheNode from "../nodes/cache/InMemoryCacheNode";
import RedisCacheNode from "../nodes/cache/RedisCacheNode";
import ConditionalChainNode from "../nodes/chains/ConditionalChainNode";
import MapReduceChainNode from "../nodes/chains/MapReduceChainNode";
import SequentialChainNode from "../nodes/chains/SequentialChainNode";
import CohereEmbeddingsNode from "../nodes/embeddings/CohereEmbeddingsNode";
import HuggingFaceEmbeddingsNode from "../nodes/embeddings/HuggingFaceEmbeddingsNode";
import GeminiNode from "../nodes/llms/GeminiNode";
import AnthropicClaudeNode from "../nodes/llms/ClaudeNode";
import BufferMemoryNode from "../nodes/memory/BufferMemory";
import ConversationMemoryNode from "../nodes/memory/ConversationMemoryNode";
import SummaryMemoryNode from "../nodes/memory/SummaryMemoryNode";
import AgentPromptNode from "../nodes/prompts/AgentPromptNode";
import PromptTemplateNode from "../nodes/prompts/PromptTemplateNode";
import PDFLoaderNode from "../nodes/document_loaders/PDFLoaderNode";
import WebLoaderNode from "../nodes/document_loaders/WebLoaderNode";
import PydanticOutputParserNode from "../nodes/output_parsers/PydanticOutputParserNode";
import StringOutputParserNode from "../nodes/output_parsers/StringOutputParserNode";
import ChromaRetrieverNode from "../nodes/retrievers/ChromaRetrieverNode";
import CharacterTextSplitterNode from "../nodes/text_splitters/CharacterTextSplitterNode";
import RecursiveTextSplitterNode from "../nodes/text_splitters/RecursiveTextSplitterNode";
import TokenTextSplitterNode from "../nodes/text_splitters/TokenTextSplitterNode";
import ArxivToolNode from "../nodes/tools/ArxivToolNode";
import FileToolNode from "../nodes/tools/FileToolNode";
import GoogleSearchNode from "../nodes/tools/GoogleSearchNode";
import JSONParserToolNode from "../nodes/tools/JSONParserToolNode";
import RequestsGetToolNode from "../nodes/tools/RequestsGetToolNode";
import RequestsPostToolNode from "../nodes/tools/RequestsPostToolNode";
import TavilySearchNode from "../nodes/tools/TavilySearchNode";
import WebBrowserToolNode from "../nodes/tools/WebBrowserToolNode";
import WikipediaToolNode from "../nodes/tools/WikipediaToolNode";
import WolframAlphaToolNode from "../nodes/tools/WolframAlphaToolNode";
import ReadFileToolNode from "../nodes/tools/ReadFileToolNode";
import CalculatorNode from "../nodes/utilities/CalculatorNode";
import TextFormatterNode from "../nodes/utilities/TextFormatterNode";
import FaissVectorStoreNode from "../nodes/vector_stores/FaissVectorStoreNode";
import PineconeVectorStoreNode from "../nodes/vector_stores/PineconeVectorStoreNode";
import QdrantVectorStoreNode from "../nodes/vector_stores/QdrantVectorStoreNode";
import WeaviateVectorStoreNode from "../nodes/vector_stores/WeaviateVectorStoreNode";
import Navbar from "../common/Navbar";
import Sidebar from "../common/Sidebar";
import EndNode from "../nodes/special/EndNode";

// Define nodeTypes outside component to prevent recreations
const baseNodeTypes = {
  ReactAgent: ToolAgentNode,
  StartNode: StartNode,
  OpenAIChat: OpenAIChatNode,
  TextDataLoader: TextLoaderNode,
  OpenAIEmbeddings: OpenAIEmbeddingsNode,
  InMemoryCache: InMemoryCacheNode,
  RedisCache: RedisCacheNode,
  ConditionalChain: ConditionalChainNode,
  LLMChain: LLMChainNode,
  MapReduceChain: MapReduceChainNode,
  SequentialChain: SequentialChainNode,
  CohereEmbeddings: CohereEmbeddingsNode,
  HuggingFaceEmbeddings: HuggingFaceEmbeddingsNode,
  AnthropicClaude: AnthropicClaudeNode,
  GoogleGemini: GeminiNode,
  BufferMemory: BufferMemoryNode,
  ConversationMemory: ConversationMemoryNode,
  SummaryMemory: SummaryMemoryNode,
  AgentPrompt: AgentPromptNode,
  PromptTemplate: PromptTemplateNode,
  PDFLoader: PDFLoaderNode,
  WebLoader: WebLoaderNode,
  PydanticOutputParser: PydanticOutputParserNode,
  StringOutputParser: StringOutputParserNode,
  ChromaRetriever: ChromaRetrieverNode,
  CharacterTextSplitter: CharacterTextSplitterNode,
  RecursiveTextSplitter: RecursiveTextSplitterNode,
  TokenTextSplitter: TokenTextSplitterNode,
  ArxivTool: ArxivToolNode,
  WriteFileTool: FileToolNode,
  GoogleSearchTool: GoogleSearchNode,
  JSONParser: JSONParserToolNode,
  RequestsGetTool: RequestsGetToolNode,
  RequestsPostTool: RequestsPostToolNode,
  TavilySearch: TavilySearchNode,
  WebBrowserTool: WebBrowserToolNode,
  WikipediaTool: WikipediaToolNode,
  WolframAlphaTool: WolframAlphaToolNode,
  ReadFileTool: ReadFileToolNode,
  Calculator: CalculatorNode,
  TextFormatter: TextFormatterNode,
  FaissVectorStore: FaissVectorStoreNode,
  PineconeVectorStore: PineconeVectorStoreNode,
  QdrantVectorStore: QdrantVectorStoreNode,
  WeaviateVectorStore: WeaviateVectorStoreNode,
  EndNode: EndNode,
};

const edgeTypes = {
  custom: CustomEdge,
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      text: "🤖 Merhaba! Ben ReAct Agent'ınızım. Size nasıl yardımcı olabilirim? Sürekli konuşabiliriz, her şeyi hatırlayacağım!",
      timestamp: new Date().toISOString(),
      session_id: "",
    },
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stream, setStream] = useState<ReadableStream | null>(null);
  const [conversationMode, setConversationMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [validationStatus, setValidationStatus] = useState<
    null | "success" | "error"
  >(null);

  const {
    currentWorkflow,
    setCurrentWorkflow,
    isLoading,
    error,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    validateWorkflow,
    executeWorkflow,
    fetchWorkflows,
    updateWorkflow,
    createWorkflow,
    executionResult,
    clearExecutionResult,
    fetchWorkflow,
  } = useWorkflows();

  const { nodes: availableNodes } = useNodes();

  const [workflowName, setWorkflowName] = useState(
    currentWorkflow?.name || "isimsiz dosya"
  );

  useEffect(() => {
    console.log("wokflowId", workflowId);
    const loadWorkflow = async () => {
      try {
        if (workflowId) {
          // Tekil workflow'u doğrudan fetch et
          await fetchWorkflow(workflowId);
        } else {
          const fetchedWorkflows = await fetchWorkflows();
          if (fetchedWorkflows && fetchedWorkflows.length > 0) {
            setCurrentWorkflow(fetchedWorkflows[0]);
          }
        }
      } catch (error) {
        setCurrentWorkflow(null);
        enqueueSnackbar("Workflow bulunamadı veya yüklenemedi.", {
          variant: "error",
        });
      }
    };
    loadWorkflow();
  }, [workflowId]);

  useEffect(() => {
    if (currentWorkflow?.name) {
      setWorkflowName(currentWorkflow.name);
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
        setEdges((prevEdges) => {
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

  // StartNode execution handler
  const handleStartNodeExecute = useCallback(
    async (nodeId: string) => {
      enqueueSnackbar("Workflow çalıştırılıyor...", { variant: "info" });

      const node = nodes.find((n) => n.id === nodeId);
      console.log("Çift tıklanan nodeId:", nodeId, nodes);
      if (!node) {
        enqueueSnackbar("Start node bulunamadı.", { variant: "warning" });
        return;
      }

      const flowData: WorkflowData = {
        nodes: nodes as WorkflowNode[],
        edges: edges as WorkflowEdge[],
      };

      try {
        const validation = await validateWorkflow(flowData);
        if (!validation.valid) {
          setValidationStatus("error");
          enqueueSnackbar(
            `Workflow validation failed:\n${validation.errors?.join("\n")}`,
            {
              variant: "error",
              style: { whiteSpace: "pre-line" },
            }
          );
          setTimeout(() => setValidationStatus(null), 3000);
          return;
        } else {
          setValidationStatus("success");
          setTimeout(() => setValidationStatus(null), 3000);
        }
      } catch (error) {
        setValidationStatus("error");
        setTimeout(() => setValidationStatus(null), 3000);
        enqueueSnackbar("Workflow doğrulama hatası oluştu.", {
          variant: "error",
        });
        return;
      }

      // prompt yerine chatInput'u kullan
      if (!chatInput || chatInput.trim() === "") {
        enqueueSnackbar("Lütfen önce chat kutusuna bir input girin.", {
          variant: "warning",
        });
        return;
      }

      try {
        clearExecutionResult();
        await executeWorkflow({
          flow_data: flowData,
          input_text: chatInput,
        });

        enqueueSnackbar(`Execution completed!`, { variant: "success" });
      } catch (error) {
        console.error("Execution error:", error);
        enqueueSnackbar("Workflow execution failed", { variant: "error" });
        return;
      }
    },
    [
      nodes,
      edges,
      validateWorkflow,
      executeWorkflow,
      clearExecutionResult,
      enqueueSnackbar,
      chatInput,
    ]
  );

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

  const handleSendMessage = async () => {
    if (chatInput.trim() === "") return;
    const userMessage = chatInput;
    const timestamp = new Date().toISOString();

    // Add user message to chat
    setChatMessages((msgs: ChatMessage[]) => [
      ...msgs,
      {
        from: "user",
        text: userMessage,
        timestamp,
        session_id: chatSessionId,
      },
    ]);
    setChatInput("");
    setIsExecuting(true);

    // Add a placeholder bot message for streaming updates
    const botMessageIndex = Date.now();
    setChatMessages((msgs: ChatMessage[]) => [
      ...msgs,
      {
        from: "bot",
        text: "🤖 Thinking...",
        timestamp: new Date().toISOString(),
        session_id: chatSessionId,
      },
    ]);

    try {
      if (nodes.length === 0) {
        setChatMessages((msgs: ChatMessage[]) =>
          msgs.map((msg, i) =>
            i === msgs.length - 1
              ? {
                  ...msg,
                  text: "🔗 Lütfen önce canvas'a ReAct Agent, OpenAI LLM ve Buffer Memory node'larını ekleyip bağlayın.",
                }
              : msg
          )
        );
        return;
      }

      // Check if we have a ReAct Agent in the workflow
      const hasReactAgent = nodes.some(
        (node) => node.type === "ReactAgent" || node.type === "ToolAgentNode"
      );

      if (!hasReactAgent && conversationMode) {
        setChatMessages((msgs: ChatMessage[]) =>
          msgs.map((msg, i) =>
            i === msgs.length - 1
              ? {
                  ...msg,
                  text: "⚠️ Sürekli konuşma modu için ReAct Agent gereklidir. Lütfen workflow'unuza bir ReAct Agent ekleyin.",
                }
              : msg
          )
        );
        return;
      }

      const flowData: WorkflowData = {
        nodes: nodes as WorkflowNode[],
        edges: edges as WorkflowEdge[],
      };

      // Use streaming execution
      const streamData = {
        flow_data: flowData,
        input_text: userMessage,
        session_context: {
          session_id: chatSessionId,
          conversation_mode: conversationMode,
          timestamp: timestamp,
        },
      };

      console.log("🔄 Starting streaming execution with data:", streamData);

      // Get streaming response
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
        }/api/v1/workflows/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            flow_data: streamData.flow_data,
            input_text: streamData.input_text || "Hello",
            session_id: streamData.session_context?.session_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      // Parse streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentBotMessage = "🤖 Thinking...";

      try {
        console.log("🔄 Starting to read streaming response...");
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("✅ Streaming completed, done=true");
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log("📦 Raw chunk received:", chunk);
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            console.log("📄 Processing line:", line);
            if (line.startsWith("data: ")) {
              try {
                const jsonData = JSON.parse(line.slice(6));
                console.log("📡 Streaming chunk:", jsonData);

                // Handle different types of streaming updates
                if (jsonData.type === "node_start") {
                  currentBotMessage = `🔄 Processing ${jsonData.node_name}...`;
                } else if (jsonData.type === "node_complete") {
                  currentBotMessage = `✅ Completed ${jsonData.node_name}`;
                } else if (jsonData.type === "token" && jsonData.token) {
                  // For token-by-token streaming (if supported)
                  if (
                    currentBotMessage === "🤖 Thinking..." ||
                    currentBotMessage.startsWith("🔄") ||
                    currentBotMessage.startsWith("✅")
                  ) {
                    currentBotMessage = jsonData.token;
                  } else {
                    currentBotMessage += jsonData.token;
                  }
                } else if (jsonData.type === "partial" && jsonData.content) {
                  // For partial response updates
                  currentBotMessage = jsonData.content;
                } else if (jsonData.type === "complete") {
                  console.log("🎯 Complete chunk found:", jsonData);
                  let finalResponse = "";
                  if (jsonData.result) {
                    if (typeof jsonData.result === "string") {
                      finalResponse = jsonData.result;
                    } else if (jsonData.result.output) {
                      finalResponse = jsonData.result.output;
                    } else {
                      finalResponse = JSON.stringify(jsonData.result, null, 2);
                    }
                  } else {
                    finalResponse =
                      "🤖 I received your message but couldn't generate a response.";
                  }
                  currentBotMessage = finalResponse;
                }

                // Update the last bot message in real-time
                setChatMessages((msgs: ChatMessage[]) =>
                  msgs.map((msg, i) =>
                    i === msgs.length - 1 && msg.from === "bot"
                      ? { ...msg, text: currentBotMessage }
                      : msg
                  )
                );
              } catch (e) {
                console.warn("❌ Failed to parse streaming chunk:", line, e);
              }
            } else if (line.trim()) {
              console.log("📄 Non-data line:", line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      console.log("🏁 Final message:", currentBotMessage);
    } catch (error: any) {
      console.error("Streaming execution error:", error);
      setChatMessages((msgs: ChatMessage[]) =>
        msgs.map((msg, i) =>
          i === msgs.length - 1 && msg.from === "bot"
            ? { ...msg, text: `❌ Error: ${error.message}` }
            : msg
        )
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        from: "bot",
        text: "🤖 Yeni session başlatıldı! Ben ReAct Agent'ınızım. Size nasıl yardımcı olabilirim?",
        timestamp: new Date().toISOString(),
        session_id: "",
      },
    ]);
    setChatInput("");
  };

  const toggleConversationMode = () => {
    setConversationMode(!conversationMode);
    setChatMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text: conversationMode
          ? "📴 Sürekli konuşma modu kapatıldı. Her mesaj bağımsız işlenecek."
          : "💬 Sürekli konuşma modu açıldı! Artık konuşma geçmişini hatırlayacağım.",
        timestamp: new Date().toISOString(),
        session_id: chatSessionId,
      },
    ]);
  };

  return (
    <>
      <Navbar
        workflowName={workflowName}
        setWorkflowName={setWorkflowName}
        onSave={handleSave}
        currentWorkflow={currentWorkflow}
      />
      <div className="w-full h-full relative pt-16 flex">
        {/* Sidebar açma butonu */}
        {!isSidebarOpen ? (
          <button
            className="fixed top-20 left-2 shadow-xl z-30 bg-blue-500 text-white border rounded-full p-2 hover:bg-blue-600 m-3 transition-all duration-200 "
            onClick={() => setIsSidebarOpen(true)}
            title="Open Sidebar"
          >
            <Plus className="w-6 h-6" />
          </button>
        ) : (
          <button
            className="fixed top-20 left-2 shadow-xl z-30 bg-blue-500 text-white border rounded-full p-2 hover:bg-blue-600 m-3 transition-all duration-200 "
            onClick={() => setIsSidebarOpen(false)}
            title="Close Sidebar"
          >
            <Minus className="w-6 h-6" />
          </button>
        )}

        {/* Sidebar modal */}
        {isSidebarOpen && <Sidebar onClose={() => setIsSidebarOpen(false)} />}
        {/* Canvas alanı */}
        <div className="flex-1">
          <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border p-2 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save Workflow"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              ) : (
                <Save
                  className={`h-5 w-5 ${
                    hasUnsavedChanges ? "text-blue-600" : "text-gray-500"
                  }`}
                />
              )}
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100"
              title="Clear Canvas"
            >
              <Eraser className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {currentWorkflow && (
            <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg border p-3 max-w-xs mt-19">
              <h3 className="font-medium text-gray-900">
                {currentWorkflow.name}
              </h3>
              {currentWorkflow.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {currentWorkflow.description}
                </p>
              )}
              <div className="text-xs text-gray-500 mt-2">
                {nodes.length} nodes, {edges.length} connections
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-20 left-4 z-10 bg-red-50 border border-red-200 rounded-lg p-3 max-w-md">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {executionResult && (
            <div className="absolute bottom-4 left-4 z-10 bg-green-50 border border-green-200 rounded-lg p-3 max-w-md">
              <div className="text-green-800 text-sm">
                <strong>Execution Result:</strong>
                <pre className="mt-1 text-xs overflow-auto max-h-32">
                  {JSON.stringify(executionResult.result, null, 2)}
                </pre>
              </div>
              <button
                onClick={clearExecutionResult}
                className="mt-2 text-xs text-green-600 hover:text-green-800"
              >
                Close
              </button>
            </div>
          )}

          <div
            ref={reactFlowWrapper}
            className="w-full h-full"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <ReactFlow
              nodes={nodes.map((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ...(node.type === "StartNode" && {
                    onExecute: handleStartNodeExecute,
                    validationStatus: validationStatus,
                  }),
                },
              }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes as any}
              edgeTypes={edgeTypes}
              fitView
              className="bg-gray-50"
            >
              <Controls position="top-right" />
              <Background gap={20} size={1} />
              <MiniMap />
            </ReactFlow>
          </div>

          <button
            className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-5 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all"
            onClick={() => setChatOpen((v) => !v)}
          >
            <svg
              className="w-5 h-5"
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
            Chat
          </button>

          {chatOpen && (
            <div className="fixed bottom-20 right-4 w-96 h-[520px] bg-white rounded-xl shadow-2xl flex flex-col z-50 animate-slide-up border border-gray-200">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">
                    ReAct Chat
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      conversationMode ? "bg-green-500" : "bg-gray-400"
                    }`}
                    title={
                      conversationMode
                        ? "Continuous mode ON"
                        : "Continuous mode OFF"
                    }
                  ></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleConversationMode}
                    className={`px-2 py-1 text-xs rounded ${
                      conversationMode
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                    title="Toggle continuous conversation"
                  >
                    {conversationMode ? "🔄" : "📄"}
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="text-red-400 hover:text-red-700"
                    title="Clear chat history"
                  >
                    <Eraser className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setChatOpen(false)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-sm ${
                      msg.from === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] ${
                        msg.from === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <span
                        className={`inline-block px-3 py-2 rounded-lg whitespace-pre-wrap ${
                          msg.from === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {msg.text}
                      </span>
                      {msg.timestamp && (
                        <div
                          className={`text-xs text-gray-400 mt-1 ${
                            msg.from === "user" ? "text-right" : "text-left"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isExecuting && (
                  <div className="text-left">
                    <span className="inline-block px-3 py-2 rounded-lg bg-gray-100 text-gray-700">
                      <span className="animate-pulse">🤖 Thinking...</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="p-2 border-t flex gap-2">
                <input
                  className="flex-1 border rounded px-2 py-1 focus:outline-none"
                  placeholder="Mesaj yaz..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isExecuting) handleSendMessage();
                  }}
                  disabled={isExecuting}
                />
                <button
                  className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                  onClick={handleSendMessage}
                  disabled={isExecuting}
                >
                  {isExecuting ? "..." : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
