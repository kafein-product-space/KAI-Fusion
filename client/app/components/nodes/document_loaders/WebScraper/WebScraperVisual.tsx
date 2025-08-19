import React from "react";
import { Position } from "@xyflow/react";
import {
  Globe,
  Trash,
  Download,
  CheckCircle,
  AlertCircle,
  Eye,
  Square,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type {
  WebScraperData,
  ScrapedDocument,
  ScrapingProgress,
} from "./types";

interface WebScraperVisualProps {
  data: WebScraperData;
  id: string;
  isHovered: boolean;
  isScraping: boolean;
  scrapedDocuments: ScrapedDocument[];
  progress: ScrapingProgress | null;
  onOpenConfig: () => void;
  onDeleteNode: (e: React.MouseEvent) => void;
  onScrapeUrls: () => void;
  onPreviewUrl: (url: string) => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  getEdges: () => any[];
}

export default function WebScraperVisual({
  data,
  id,
  isHovered,
  isScraping,
  scrapedDocuments,
  progress,
  onOpenConfig,
  onDeleteNode,
  onScrapeUrls,
  onPreviewUrl,
  onCopyToClipboard,
  getEdges,
}: WebScraperVisualProps) {
  const edges = getEdges();

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    if (isScraping) return "from-yellow-500 to-orange-600";
    if (scrapedDocuments.length > 0) return "from-emerald-500 to-green-600";

    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      case "warning":
        return "from-yellow-500 to-orange-600";
      case "pending":
        return "from-blue-500 to-cyan-600";
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
      case "warning":
        return "shadow-yellow-500/30";
      case "pending":
        return "shadow-blue-500/30";
      default:
        return "shadow-blue-500/30";
    }
  };

  return (
    <div
      className={`relative transition-all duration-300 transform ${
        isHovered ? "scale-105" : "scale-100"
      }`}
    >
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300
          bg-gradient-to-br ${getStatusColor()}
          ${
            isHovered
              ? `shadow-2xl ${getGlowColor()}`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={onOpenConfig}
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
              onClick={onDeleteNode}
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
                  onScrapeUrls();
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
                  const firstUrl = data?.urls?.split("\n")[0];
                  if (firstUrl) {
                    onPreviewUrl(firstUrl);
                  }
                }}
                title="Preview Content"
              >
                <Eye size={14} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Input Handles */}
      <NeonHandle
        type="target"
        position={Position.Left}
        id="execute"
        isConnectable={true}
        size={10}
        color1="#3b82f6"
        glow={isHandleConnected("execute", true)}
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
      />

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
  );
}
