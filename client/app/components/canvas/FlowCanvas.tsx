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
import StartNode from "../nodes/other/StartNode";
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
import { Eraser, Save } from "lucide-react";
import TextLoaderNode from "../nodes/document_loaders/TextLoaderNode";
import OpenAIEmbeddingsNode from "../nodes/embeddings/OpenAIEmbeddingsNode";
import InMemoryCacheNode from "../nodes/cache/InMemoryCacheNode";
import RedisCacheNode from "../nodes/cache/RedisCacheNode";
import ConditionalChainNode from "../nodes/chains/ConditionalChainNode";
import RouterChainNode from "../nodes/chains/RouterChainNode";
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
import SitemapLoaderNode from "../nodes/document_loaders/SitemapLoaderNode";
import YoutubeLoaderNode from "../nodes/document_loaders/YoutubeLoaderNode";
import GitHubLoaderNode from "../nodes/document_loaders/GitHubLoaderNode";

const baseNodeTypes = {
  ReactAgent: ToolAgentNode,
  StartNode: StartNode,
  OpenAIChat: OpenAIChatNode,
  TextDataLoader: TextLoaderNode,
  OpenAIEmbeddings: OpenAIEmbeddingsNode,
  InMemoryCache: InMemoryCacheNode,
  RedisCache: RedisCacheNode,
  ConditionalChain: ConditionalChainNode,
  RouterChain: RouterChainNode,
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
  SitemapLoader: SitemapLoaderNode,
  YoutubeLoader: YoutubeLoaderNode,
  GitHubLoader: GitHubLoaderNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

interface ChatMessage {
  from: "user" | "bot";
  text: string;
}

function FlowCanvas() {
  const { enqueueSnackbar } = useSnackbar();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodeId, setNodeId] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Merhaba! Size nasıl yardımcı olabilirim?" },
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stream, setStream] = useState<ReadableStream | null>(null);

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
  } = useWorkflows();

  const { nodes: availableNodes } = useNodes();

  useEffect(() => {
    const loadInitialWorkflow = async () => {
      try {
        const fetchedWorkflows = await fetchWorkflows();
        if (fetchedWorkflows && fetchedWorkflows.length > 0) {
          setCurrentWorkflow(fetchedWorkflows[0]);
        }
      } catch (error) {
        console.error("Failed to load initial workflow:", error);
        enqueueSnackbar("Failed to load workflows", { variant: "error" });
      }
    };
    loadInitialWorkflow();
  }, []);

  useEffect(() => {
    if (currentWorkflow?.flow_data) {
      const { nodes, edges } = currentWorkflow.flow_data;
      setNodes(nodes || []);
      setEdges(edges || []);
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

    if (!currentWorkflow) {
      const name = prompt("Enter a name for the new workflow:");
      if (!name) return;

      try {
        const newWorkflow = await createWorkflow({
          name,
          description: "",
          flow_data: flowData,
        });
        setCurrentWorkflow(newWorkflow);
        enqueueSnackbar(`Workflow "${name}" created and saved!`, {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar("Failed to create workflow.", { variant: "error" });
      }
      return;
    }

    try {
      await updateWorkflow(currentWorkflow.id, {
        name: currentWorkflow.name,
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
  ]);

  const handleExecuteStream = useCallback(async () => {
    if (nodes.length === 0) {
      enqueueSnackbar("Lütfen bir node ekleyin", { variant: "error" });
      return;
    }

    const flowData: WorkflowData = {
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
    };

    const inputText = prompt("Enter input text for the workflow:");
    if (!inputText) return;

    try {
      const streamResponse = await WorkflowService.executeWorkflowStream({
        flow_data: flowData,
        input_text: inputText,
      });
      setStream(streamResponse);
    } catch (e) {
      console.error("Streaming execution error", e);
      enqueueSnackbar("Streaming execution failed", { variant: "error" });
    }
  }, [nodes, edges, enqueueSnackbar]);

  const closeStreamModal = () => setStream(null);

  const handleExecute = useCallback(async () => {
    if (nodes.length === 0) {
      enqueueSnackbar("Please add some nodes to execute the workflow", {
        variant: "error",
      });
      return;
    }

    const flowData: WorkflowData = {
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
    };

    try {
      const validation = await validateWorkflow(flowData);
      if (!validation.valid) {
        enqueueSnackbar(
          `Workflow validation failed:\n${validation.errors?.join("\n")}`,
          {
            variant: "error",
            style: { whiteSpace: "pre-line" },
          }
        );
        return;
      }
    } catch (error) {
      console.error("Validation error:", error);
      enqueueSnackbar("Failed to validate workflow", { variant: "error" });
      return;
    }

    const inputText = prompt("Enter input text for the workflow:");
    if (!inputText) return;

    try {
      clearExecutionResult();
      await executeWorkflow({
        flow_data: flowData,
        input_text: inputText,
      });

      enqueueSnackbar(`Execution completed!`, { variant: "success" });
    } catch (error) {
      console.error("Execution error:", error);
      enqueueSnackbar("Workflow execution failed", { variant: "error" });
    }
  }, [
    nodes,
    edges,
    validateWorkflow,
    executeWorkflow,
    clearExecutionResult,
    enqueueSnackbar,
  ]);

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
    setChatMessages((msgs: ChatMessage[]) => [
      ...msgs,
      { from: "user", text: userMessage },
    ]);
    setChatInput("");
    setIsExecuting(true);

    try {
      if (nodes.length === 0) {
        setChatMessages((msgs: ChatMessage[]) => [
          ...msgs,
          { from: "bot", text: "Lütfen önce canvas'a node ekleyin." },
        ]);
        return;
      }
      const flowData: WorkflowData = {
        nodes: nodes as WorkflowNode[],
        edges: edges as WorkflowEdge[],
      };
      const result = await executeWorkflow({
        flow_data: flowData,
        input_text: userMessage,
      });

      const resultText = result?.result
        ? JSON.stringify(result.result, null, 2)
        : "No response from workflow.";
      setChatMessages((msgs: ChatMessage[]) => [
        ...msgs,
        { from: "bot", text: resultText },
      ]);
    } catch (error: any) {
      setChatMessages((msgs: ChatMessage[]) => [
        ...msgs,
        { from: "bot", text: `An error occurred: ${error.message}` },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      { from: "bot", text: "Merhaba! Size nasıl yardımcı olabilirim?" },
    ]);
    setChatInput("");
  };

  const nodeTypes = useMemo(() => ({ ...baseNodeTypes }), []);

  return (
    <div className="w-full h-full relative">
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
          onClick={handleExecute}
          disabled={nodes.length === 0}
          className="p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50"
          title="Execute Workflow"
        >
          ▶️
        </button>
        <button
          onClick={handleExecuteStream}
          disabled={nodes.length === 0}
          className="p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50"
          title="Execute and Stream"
        >
          ⚡️
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
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg border p-3 max-w-xs">
          <h3 className="font-medium text-gray-900">{currentWorkflow.name}</h3>
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
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="bg-gray-50"
        >
          <Controls position="top-right" />
          <Background gap={20} size={1} />
          <MiniMap />
        </ReactFlow>
      </div>

      {stream && <StreamingModal stream={stream} onClose={closeStreamModal} />}

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
        <div className="fixed bottom-20 right-4 w-96 h-[480px] bg-white rounded-xl shadow-2xl flex flex-col z-50 animate-slide-up border border-gray-200">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="font-semibold text-gray-700">Chat</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearChat}
                className="text-red-400 hover:text-red-700"
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
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm ${
                  msg.from === "user" ? "text-right" : "text-left"
                }`}
              >
                <span
                  className={`inline-block px-3 py-2 rounded-lg ${
                    msg.from === "user"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            ))}
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
  );
}

export default function FlowCanvasWrapper() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
