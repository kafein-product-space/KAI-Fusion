import React, { useRef, useState, useEffect } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Database,
  Trash,
  FileText,
  Search,
  BarChart3,
  Zap,
  Settings,
  Save,
  X,
} from "lucide-react";
import PostgreSQLVectorStoreConfigModal from "~/components/modals/vectorstores/PostgreSQLVectorStoreConfigModal";
import NeonHandle from "~/components/common/NeonHandle";
import { useSnackbar } from "notistack";

interface PostgreSQLVectorStoreNodeProps {
  data: any;
  id: string;
}

function PostgreSQLVectorStoreNode({
  data,
  id,
}: PostgreSQLVectorStoreNodeProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState(data);
  const modalRef = useRef<HTMLDialogElement>(null);

  const handleOpenModal = () => {
    modalRef.current?.showModal();
  };

  const handleConfigSave = (newConfig: any) => {
    setConfigData(newConfig);
    setNodes((nodes: any[]) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newConfig } }
          : node
      )
    );
    enqueueSnackbar("Config saved", {
      variant: "success",
    });
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const handleDoubleClick = () => {
    setIsConfigMode(true);
  };

  const handleSaveConfig = () => {
    // Update the node data with config data
    setNodes((nodes: any[]) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...configData } }
          : node
      )
    );
    setIsConfigMode(false);
    enqueueSnackbar("Config saved", {
      variant: "success",
    });
  };

  const handleCancelConfig = () => {
    setIsConfigMode(false);
    setConfigData(data); // Reset to original data
  };

  // Keyboard shortcuts for config mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfigMode) {
        if (e.key === "Escape") {
          handleCancelConfig();
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          handleSaveConfig();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isConfigMode, configData]);

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
        return "from-green-500 to-emerald-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-green-500/30";
    }
  };

  // Config mode render
  if (isConfigMode) {
    return (
      <div
        className={`relative group w-48 h-auto min-h-32 rounded-xl 
          bg-gradient-to-br from-slate-800 to-slate-900
          border-2 border-gray-500 shadow-xl shadow-cyan-500/20
          backdrop-blur-sm p-3 flex flex-col items-center justify-center`}
      >
        {/* Config Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-white text-xs font-bold">
              PostgreSQL Vector Store
            </span>
          </div>
          <div className="ml-auto">
            <Settings className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Formik Form */}
        <Formik
          initialValues={{
            connection_string: configData.connection_string || "",
            collection_name: configData.collection_name || "",
            search_k: configData.search_k || 6,
          }}
          enableReinitialize
          validate={(values) => {
            const errors: any = {};
            if (!values.connection_string) {
              errors.connection_string = "Connection string is required";
            }
            if (values.search_k < 1 || values.search_k > 20) {
              errors.search_k = "Search K must be between 1 and 20";
            }
            return errors;
          }}
          onSubmit={(values) => {
            setConfigData({
              ...configData,
              ...values,
            });
            handleSaveConfig();
          }}
        >
          {({ values, setFieldValue, errors, touched, isSubmitting }) => (
            <Form className="space-y-3 w-full mb-3">
              {/* Connection String */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Connection String
                </label>
                <Field
                  name="connection_string"
                  type="password"
                  placeholder="postgresql://user:pass@host:port/db"
                  className={`w-full bg-slate-900/80 border rounded-md text-white px-2 py-1 placeholder-slate-400 focus:ring-1 transition-all text-xs ${
                    errors.connection_string && touched.connection_string
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-600/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                  }`}
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <ErrorMessage
                  name="connection_string"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>

              {/* Collection Name */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Collection Name
                </label>
                <Field
                  name="collection_name"
                  type="text"
                  placeholder="rag_collection_123"
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-md text-white px-2 py-1 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-xs"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
              </div>

              {/* Search K */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white text-xs font-medium">
                    Search K
                  </label>
                  <span className="text-cyan-400 text-xs font-bold">
                    {values.search_k}
                  </span>
                </div>
                <Field
                  name="search_k"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  className="w-full h-1 bg-slate-700 rounded-md appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                      (values.search_k - 1) * 5.26
                    }%, #374151 ${
                      (values.search_k - 1) * 5.26
                    }%, #374151 100%)`,
                  }}
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1</span>
                  <span>20</span>
                </div>
                <ErrorMessage
                  name="search_k"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleCancelConfig}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-all"
                >
                  ✕
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓
                </button>
              </div>
            </Form>
          )}
        </Formik>

        {/* Keyboard hint */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded shadow-lg">
            Esc/Ctrl+Enter
          </div>
        </div>
      </div>
    );
  }

  // Normal mode render
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
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Double click to configure"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <Database className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
              <Zap className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "PostgreSQL"}
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

        {/* Input Handle - Documents */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="documents"
          isConnectable={true}
          size={10}
          color1="#4ade80"
          glow={isHandleConnected("documents")}
        />

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="retriever"
          isConnectable={true}
          size={10}
          color1="#4ade80"
          glow={isHandleConnected("retriever", true)}
          style={{
            top: "25%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="vectorstore"
          isConnectable={true}
          size={10}
          color1="#10b981"
          glow={isHandleConnected("vectorstore", true)}
          style={{
            top: "50%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="storage_stats"
          isConnectable={true}
          size={10}
          color1="#059669"
          glow={isHandleConnected("storage_stats", true)}
          style={{
            top: "75%",
          }}
        />

        {/* Handle labels */}
        <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
          Documents
        </div>

        {/* Right side labels for outputs */}
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "20%" }}
        >
          Retriever
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "45%" }}
        >
          Vector Store
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "70%" }}
        >
          Storage Stats
        </div>

        {/* Database Type Badge */}
        {data?.connection_string && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg">
              PostgreSQL
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.connected && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Modal - keeping for backward compatibility */}
      <PostgreSQLVectorStoreConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default PostgreSQLVectorStoreNode;
