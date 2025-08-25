import React, { useState } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Database,
  Trash,
  Activity,
  Zap,
  Brain,
  Settings,
  Sparkles,
  Shield,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Lock,
  Palette,
  ArrowLeftRight,
  FileText,
  Code,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";

interface IntelligentVectorStoreNodeProps {
  data: any;
  id: string;
}

function IntelligentVectorStoreNode({
  data,
  id,
}: IntelligentVectorStoreNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState(data);

  const edges = getEdges ? getEdges() : [];

  const handleDoubleClick = () => {
    setIsConfigMode(true);
  };

  const handleSaveConfig = () => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...configData } }
          : node
      )
    );
    setIsConfigMode(false);
  };

  const handleCancelConfig = () => {
    setConfigData(data);
    setIsConfigMode(false);
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    switch (data?.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-green-500 to-emerald-600";
    }
  };

  const getGlowColor = () => {
    switch (data?.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-green-500/30";
    }
  };

  if (isConfigMode) {
    return (
      <div
        className={`relative group w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300 transform
          bg-gradient-to-br from-slate-800 to-slate-900
          shadow-2xl shadow-cyan-500/30
          border border-white/20 backdrop-blur-sm`}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-medium">
              Intelligent Vector Store
            </span>
          </div>
          <Settings className="w-4 h-4 text-white" />
        </div>

        {/* Config Form */}
        <Formik
          initialValues={{
            connection_string: configData.connection_string || "",
            collection_name: configData.collection_name || "",
            pre_delete_collection: configData.pre_delete_collection ?? false,
            auto_optimize: configData.auto_optimize ?? true,
            embedding_dimension: configData.embedding_dimension || 0,
            search_algorithm: configData.search_algorithm || "cosine",
            search_k: configData.search_k || 6,
            score_threshold: configData.score_threshold || 0.0,
            batch_size: configData.batch_size || 100,
          }}
          enableReinitialize
          validate={(values) => {
            const errors: any = {};
            if (!values.connection_string) {
              errors.connection_string = "Connection string is required";
            }
            if (
              values.embedding_dimension < 0 ||
              values.embedding_dimension > 4096
            ) {
              errors.embedding_dimension =
                "Dimension must be between 0 and 4096";
            }
            if (values.search_k < 1 || values.search_k > 50) {
              errors.search_k = "Search K must be between 1 and 50";
            }
            if (values.score_threshold < 0 || values.score_threshold > 1) {
              errors.score_threshold =
                "Score threshold must be between 0 and 1";
            }
            if (values.batch_size < 10 || values.batch_size > 1000) {
              errors.batch_size = "Batch size must be between 10 and 1000";
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
            <Form className="space-y-3 w-full p-3">
              {/* Connection String */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Connection String
                </label>
                <Field
                  name="connection_string"
                  type="password"
                  placeholder="postgresql://user:pass@host:port/db"
                  className={`w-full bg-slate-900/80 border rounded-lg text-white px-2 py-1 placeholder-slate-400 focus:ring-1 transition-all text-xs ${
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
                  placeholder="smart_collection_123"
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-2 py-1 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-xs"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
              </div>

              {/* Auto Optimize Toggle */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Auto Optimize
                </label>
                <Field name="auto_optimize">
                  {({ field }: any) => (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="sr-only peer"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-600"></div>
                    </label>
                  )}
                </Field>
              </div>

              {/* Search Algorithm */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Search Algorithm
                </label>
                <Field name="search_algorithm">
                  {({ field }: any) => (
                    <select
                      {...field}
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-2 py-1 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-xs"
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    >
                      <option value="cosine">Cosine Similarity</option>
                      <option value="euclidean">Euclidean Distance</option>
                      <option value="inner_product">Inner Product</option>
                    </select>
                  )}
                </Field>
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
                  max={50}
                  step={1}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                      ((values.search_k - 1) / 49) * 100
                    }%, #374151 ${
                      ((values.search_k - 1) / 49) * 100
                    }%, #374151 100%)`,
                  }}
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1</span>
                  <span>50</span>
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
                  className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    );
  }

  /* Normal Mode */
  return (
    <div className="relative group">
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
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Intelligent Vector Store"}
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

        {/* Input Handles - Sol taraf */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="documents"
          isConnectable={true}
          size={10}
          color1="#4ade80"
          glow={isHandleConnected("documents", false)}
          style={{
            top: "30%",
          }}
        />

        <NeonHandle
          type="target"
          position={Position.Left}
          id="embedder"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("embedder", false)}
          style={{
            top: "70%",
          }}
        />

        {/* Output Handles - Sağ taraf */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="retriever"
          isConnectable={true}
          size={10}
          color1="#4ade80"
          glow={isHandleConnected("retriever", true)}
          style={{
            top: "30%",
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
            top: "70%",
          }}
        />

        {/* Input labels - Sol taraf */}
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "25%" }}
        >
          Documents
        </div>
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "65%" }}
        >
          Embedder
        </div>

        {/* Output labels - Sağ taraf */}
        <div
          className="absolute -right-20 text-xs text-gray-500 font-medium"
          style={{ top: "25%" }}
        >
          Retriever
        </div>
        <div
          className="absolute -right-20 text-xs text-gray-500 font-medium"
          style={{ top: "65%" }}
        >
          VectorStore
        </div>

        {/* Database Type Badge */}
        {data?.collection_name && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold shadow-lg">
              {data.collection_name}
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.connection_status && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Optimization Status Indicator */}
        {data?.auto_optimize && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Performance Indicator */}
        {data?.performance_metrics && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <BarChart3 className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Search Algorithm Badge */}
        {data?.search_algorithm && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg transform rotate-90">
              {data.search_algorithm === "cosine"
                ? "Cosine"
                : data.search_algorithm === "euclidean"
                ? "Euclidean"
                : "Inner"}
            </div>
          </div>
        )}

        {/* Search K Badge */}
        {data?.search_k && (
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold shadow-lg transform -rotate-90">
              K={data.search_k}
            </div>
          </div>
        )}

        {/* Optimization Status Badge */}
        {data?.optimization_status && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold shadow-lg">
              {data.optimization_status === "optimized"
                ? "Optimized"
                : data.optimization_status === "optimizing"
                ? "Optimizing"
                : data.optimization_status === "failed"
                ? "Failed"
                : "Ready"}
            </div>
          </div>
        )}

        {/* Storage Stats Indicator */}
        {data?.storage_stats && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Optimization Report Indicator */}
        {data?.optimization_report && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IntelligentVectorStoreNode;
