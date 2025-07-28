import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import {
  Globe,
  Trash,
  Activity,
  Wifi,
  Download,
  Network,
  Globe2,
  Zap,
  Clock,
  AlertCircle,
} from "lucide-react";
import WebScraperConfigModal from "~/components/modals/document_loaders/WebScraperConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface WebScraperNodeProps {
  data: any;
  id: string;
}

function WebScraperNode({ data, id }: WebScraperNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
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
  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-indigo-600";
    }
  };

  const getGlowColor = () => {
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
            <Globe2 className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
              <Network className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Scraper"}
        </div>

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
          </>
        )}

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Top}
          id="output"
          size={10}
          isConnectable={true}
          color1="#0ea5e9"
          glow={isHandleConnected("output", true)}
        />

        {/* Top side label for output */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
          Content
        </div>

        {/* Web Scraper Type Badge */}
        {data?.scraper_type && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
              {data.scraper_type === "html"
                ? "HTML"
                : data.scraper_type === "text"
                ? "Text"
                : data.scraper_type === "structured"
                ? "Structured"
                : data.scraper_type?.toUpperCase() || "SCRAPER"}
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.url && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Scraping Activity Indicator */}
        {data?.is_scraping && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Activity className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Network Status Indicator */}
        {data?.network_status && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Wifi className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Download Progress Indicator */}
        {data?.download_progress && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Performance Indicator */}
        {data?.performance_metrics && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* URL Domain Badge */}
        {data?.url && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg transform rotate-90">
              {data.url?.includes("http") ? "Web" : "URL"}
            </div>
          </div>
        )}

        {/* Scraper Type Indicator */}
        {data?.scraper_type && (
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg transform -rotate-90">
              {data.scraper_type === "html"
                ? "HTML"
                : data.scraper_type === "text"
                ? "Text"
                : "Web"}
            </div>
          </div>
        )}

        {/* Scraping Status Badge */}
        {data?.scraping_status && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-lg">
              {data.scraping_status === "scraping"
                ? "Scraping"
                : data.scraping_status === "completed"
                ? "Completed"
                : data.scraping_status === "error"
                ? "Error"
                : data.scraping_status === "timeout"
                ? "Timeout"
                : "Ready"}
            </div>
          </div>
        )}

        {/* Response Time Indicator */}
        {data?.response_time && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Clock className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Error Indicator */}
        {data?.has_error && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Content Size Indicator */}
        {data?.content_size && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Rate Limiting Indicator */}
        {data?.rate_limited && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <AlertCircle className="w-2 h-2 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <WebScraperConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default WebScraperNode;
