import React, { useRef, useState, useEffect } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  ArrowUpCircle,
  Trash,
  Globe,
  Code,
  CheckCircle,
  Hash,
  Settings,
  Send,
  Play,
  Square,
  Copy,
  AlertCircle,
  Clock,
  BarChart3,
  ExternalLink,
  FileText,
  Zap,
  Download,
  Upload,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import HTTPClientConfigModal from "~/components/modals/tools/HTTPClientConfigModal";

interface HTTPClientNodeProps {
  data: any;
  id: string;
}

interface HttpResponse {
  status_code: number;
  content: any;
  headers: Record<string, string>;
  success: boolean;
  request_stats?: {
    duration_ms: number;
    size_bytes: number;
    timestamp: string;
  };
}

interface HttpTestState {
  isTesting: boolean;
  response?: HttpResponse;
  error?: string;
  stats?: any;
}

function HTTPClientNode({ data, id }: HTTPClientNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<HttpResponse>();
  const [testError, setTestError] = useState<string | null>(null);
  const [testStats, setTestStats] = useState<any>();
  const modalRef = useRef<HTMLDialogElement>(null);

  const handleOpenModal = () => {
    modalRef.current?.showModal();
  };

  const handleConfigSave = (newConfig: any) => {
    setNodes((nodes: any[]) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newConfig } }
          : node
      )
    );
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const sendTestRequest = async () => {
    if (!data?.url) {
      setTestError("URL is required for testing");
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestResponse(undefined);

    try {
      const response = await fetch(`/api/http-client/${id}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: data.url,
          method: data.method || "GET",
          headers: data.headers || {},
          body: data.body || "",
          timeout: data.timeout || 30,
          max_retries: data.max_retries || 3,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResponse(result);
        setTestStats(result.request_stats);
      } else {
        const errorData = await response.json();
        setTestError(errorData.error || "Request failed");
      }
    } catch (err) {
      setTestError("Network error: " + (err as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${type} copied to clipboard`);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const generateCurlCommand = () => {
    if (!data?.url) return "";

    let curl = `curl -X ${data.method || "GET"} "${data.url}"`;

    if (data.headers) {
      Object.entries(data.headers).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
    }

    if (data.body && data.method !== "GET") {
      curl += ` \\\n  -d '${JSON.stringify(data.body)}'`;
    }

    return curl;
  };

  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    if (isTesting) return "from-yellow-500 to-orange-600";
    if (testResponse?.success) return "from-emerald-500 to-teal-600";
    if (testError) return "from-red-500 to-rose-600";

    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-teal-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-purple-600";
    }
  };

  const getGlowColor = () => {
    if (isTesting) return "shadow-yellow-500/50";
    if (testResponse?.success) return "shadow-emerald-500/30";
    if (testError) return "shadow-red-500/30";

    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-blue-500/30";
    }
  };

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br ${getStatusColor()}
          ${
            isHovered
              ? `shadow-2xl ${getGlowColor()}`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Double click to configure"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <ArrowUpCircle className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Testing indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
              {isTesting ? (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              ) : testResponse ? (
                <CheckCircle className="w-2 h-2 text-white" />
              ) : (
                <Globe className="w-2 h-2 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "HTTP"}
        </div>

        {/* Testing status */}
        {isTesting && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-yellow-600 text-white text-xs font-bold shadow-lg animate-pulse">
              ⚡ TESTING
            </div>
          </div>
        )}

        {/* Success status */}
        {testResponse?.success && !isTesting && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg">
              ✅ {testResponse.status_code}
            </div>
          </div>
        )}

        {/* Error status */}
        {testError && !isTesting && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-red-600 text-white text-xs font-bold shadow-lg">
              ❌ ERROR
            </div>
          </div>
        )}

        {/* Hover effects */}
        {isHovered && (
          <>
            {/* Delete button */}
            <button
              className="absolute -top-3 -right-3 w-8 h-8 
                bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={handleDeleteNode}
              title="Delete Node"
            >
              <Trash size={14} />
            </button>

            {/* Test button */}
            <button
              className={`absolute -bottom-3 -right-3 w-8 h-8 
                ${
                  isTesting
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500"
                }
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm`}
              onClick={(e) => {
                e.stopPropagation();
                if (isTesting) {
                  // Cancel testing if needed
                } else {
                  sendTestRequest();
                }
              }}
              title={isTesting ? "Cancel Test" : "Send Test Request"}
            >
              {isTesting ? <Square size={14} /> : <Send size={14} />}
            </button>
          </>
        )}

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="response"
          isConnectable={true}
          size={10}
          color1="#3b82f6"
          glow={isHandleConnected("response", true)}
          style={{
            top: "20%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="status_code"
          isConnectable={true}
          size={10}
          color1="#8b5cf6"
          glow={isHandleConnected("status_code", true)}
          style={{
            top: "40%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="content"
          isConnectable={true}
          size={10}
          color1="#10b981"
          glow={isHandleConnected("content", true)}
          style={{
            top: "60%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="headers"
          isConnectable={true}
          size={10}
          color1="#f59e0b"
          glow={isHandleConnected("headers", true)}
          style={{
            top: "80%",
          }}
        />

        {/* Right side labels for outputs */}
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "15%" }}
        >
          Response
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "35%" }}
        >
          Status
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "55%" }}
        >
          Content
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "75%" }}
        >
          Headers
        </div>

        {/* HTTP Method Badge */}
        {data?.method && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
              {data.method}
            </div>
          </div>
        )}

        {/* URL Badge */}
        {data?.url && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <Globe className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Test result badge */}
        {testResponse && !isTesting && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">
                {testResponse.status_code}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <HTTPClientConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
        isTesting={isTesting}
        testResponse={testResponse}
        testError={testError}
        testStats={testStats}
        onSendTestRequest={sendTestRequest}
        onCopyToClipboard={copyToClipboard}
        generateCurlCommand={generateCurlCommand}
      />
    </>
  );
}

export default HTTPClientNode;
