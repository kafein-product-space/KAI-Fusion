import React, { useRef, useState, useEffect } from "react";
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
  Play,
  Square,
  Eye,
  FileText,
  CheckCircle,
  BarChart3,
  ExternalLink,
  Copy,
  Download as DownloadIcon,
} from "lucide-react";
import WebScraperConfigModal from "~/components/modals/document_loaders/WebScraperConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface WebScraperNodeProps {
  data: any;
  id: string;
}

interface ScrapedDocument {
  url: string;
  title?: string;
  content: string;
  contentLength: number;
  domain: string;
  scrapedAt: string;
  status: "success" | "failed" | "processing";
}

interface ScrapingProgress {
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  currentUrl?: string;
  startTime: Date;
  estimatedTimeRemaining: number;
  avgProcessingTime: number;
  totalContentExtracted: number;
}

function WebScraperNode({ data, id }: WebScraperNodeProps) {
  const { setNodes, getEdges, getNodes } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedDocuments, setScrapedDocuments] = useState<ScrapedDocument[]>(
    []
  );
  const [progress, setProgress] = useState<ScrapingProgress | null>(null);
  const [previewContent, setPreviewContent] = useState<any>(null);
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

  const scrapeUrls = async () => {
    const inputData = getInputData();
    const urlsToScrape = inputData.urls || data?.urls || data?.input_urls;

    if (!urlsToScrape) {
      console.error("No URLs to scrape");
      return;
    }

    setIsScraping(true);
    setScrapedDocuments([]);
    setProgress(null);

    try {
      const response = await fetch(`/api/web-scraper/${id}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls:
            typeof urlsToScrape === "string"
              ? urlsToScrape
              : urlsToScrape.join("\n"),
          input_urls: Array.isArray(urlsToScrape) ? urlsToScrape : [],
          user_agent:
            inputData.config?.user_agent ||
            data?.user_agent ||
            "Default KAI-Fusion",
          remove_selectors:
            inputData.config?.remove_selectors || data?.remove_selectors || "",
          min_content_length:
            inputData.config?.min_content_length ||
            data?.min_content_length ||
            100,
          max_concurrent:
            inputData.config?.max_concurrent || data?.max_concurrent || 5,
          timeout_seconds:
            inputData.config?.timeout_seconds || data?.timeout_seconds || 30,
          retry_attempts:
            inputData.config?.retry_attempts || data?.retry_attempts || 3,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setScrapedDocuments(result.documents || []);
        setProgress(result.progress);
      } else {
        const errorData = await response.json();
        console.error("Scraping failed:", errorData.error);
      }
    } catch (err) {
      console.error("Network error during scraping:", err);
    } finally {
      setIsScraping(false);
    }
  };

  const previewUrl = async (url: string) => {
    try {
      const response = await fetch(`/api/web-scraper/${id}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          remove_selectors: data.remove_selectors || "",
          min_content_length: data.min_content_length || 100,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewContent(result);
      }
    } catch (err) {
      console.error("Preview failed:", err);
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

  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  // Input edge'lerinden gelen verileri al
  const getInputData = () => {
    const nodes = getNodes();
    const inputEdges = edges.filter((edge) => edge.target === id);
    const inputData: any = {};

    inputEdges.forEach((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      if (sourceNode && sourceNode.data) {
        if (edge.targetHandle === "urls") {
          inputData.urls =
            sourceNode.data.output ||
            sourceNode.data.urls ||
            sourceNode.data.content;
        } else if (edge.targetHandle === "config") {
          inputData.config =
            sourceNode.data.output || sourceNode.data.config || sourceNode.data;
        }
      }
    });

    return inputData;
  };

  const getStatusColor = () => {
    if (isScraping) return "from-yellow-500 to-orange-600";
    if (scrapedDocuments.length > 0) return "from-emerald-500 to-green-600";

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
    if (isScraping) return "shadow-yellow-500/50";
    if (scrapedDocuments.length > 0) return "shadow-emerald-500/30";

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
            <Globe className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Scraping indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
              {isScraping ? (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              ) : scrapedDocuments.length > 0 ? (
                <CheckCircle className="w-2 h-2 text-white" />
              ) : (
                <Download className="w-2 h-2 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Web Scraper"}
        </div>

        {/* Scraping status */}
        {isScraping && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-yellow-600 text-white text-xs font-bold shadow-lg animate-pulse">
              ⚡ SCRAPING
            </div>
          </div>
        )}

        {/* Success status */}
        {scrapedDocuments.length > 0 && !isScraping && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg">
              ✅ {scrapedDocuments.length} Docs
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

            {/* Scrape button */}
            <button
              className={`absolute -bottom-3 -right-3 w-8 h-8 
                ${
                  isScraping
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500"
                }
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm`}
              onClick={(e) => {
                e.stopPropagation();
                if (isScraping) {
                  // Cancel scraping if needed
                } else {
                  scrapeUrls();
                }
              }}
              title={isScraping ? "Cancel Scraping" : "Start Scraping"}
            >
              {isScraping ? <Square size={14} /> : <Download size={14} />}
            </button>

            {/* Preview button */}
            {data?.urls && (
              <button
                className="absolute -bottom-3 -left-3 w-8 h-8 
                  bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
                  text-white rounded-full border border-white/30 shadow-xl 
                  transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                  backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const firstUrl = data.urls.split("\n")[0];
                  if (firstUrl) {
                    previewUrl(firstUrl);
                  }
                }}
                title="Preview Content"
              >
                <Eye size={14} />
              </button>
            )}
          </>
        )}

        {/* Input Handles */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="urls"
          isConnectable={true}
          size={10}
          color1="#ef4444"
          glow={isHandleConnected("urls", false)}
          style={{
            top: "20%",
          }}
        />

        <NeonHandle
          type="target"
          position={Position.Left}
          id="config"
          isConnectable={true}
          size={10}
          color1="#f97316"
          glow={isHandleConnected("config", false)}
          style={{
            top: "40%",
          }}
        />

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="documents"
          isConnectable={true}
          size={10}
          color1="#3b82f6"
          glow={isHandleConnected("documents", true)}
          style={{
            top: "20%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="content"
          isConnectable={true}
          size={10}
          color1="#8b5cf6"
          glow={isHandleConnected("content", true)}
          style={{
            top: "40%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="metadata"
          isConnectable={true}
          size={10}
          color1="#10b981"
          glow={isHandleConnected("metadata", true)}
          style={{
            top: "60%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="stats"
          isConnectable={true}
          size={10}
          color1="#f59e0b"
          glow={isHandleConnected("stats", true)}
          style={{
            top: "80%",
          }}
        />

        {/* Left side labels for inputs */}
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "15%" }}
        >
          URLs
        </div>
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "35%" }}
        >
          Config
        </div>

        {/* Right side labels for outputs */}
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "15%" }}
        >
          Documents
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "35%" }}
        >
          Content
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "55%" }}
        >
          Metadata
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "75%" }}
        >
          Stats
        </div>

        {/* Web Scraper Type Badge */}
        {data?.urls && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
              Web Scraper
            </div>
          </div>
        )}

        {/* URL count badge */}
        {data?.urls && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">
                {data.urls.split("\n").filter((url: any) => url.trim()).length}
              </span>
            </div>
          </div>
        )}

        {/* Input connection badges */}
        {isHandleConnected("urls", false) && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">URL</span>
            </div>
          </div>
        )}

        {isHandleConnected("config", false) && (
          <div
            className="absolute top-1 left-1 z-10"
            style={{ marginLeft: "20px" }}
          >
            <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">CFG</span>
            </div>
          </div>
        )}

        {/* Scraped documents count badge */}
        {scrapedDocuments.length > 0 && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">
                {scrapedDocuments.length}
              </span>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {progress && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
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
