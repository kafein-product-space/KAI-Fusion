import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Search, Settings, Database, Zap, Trash, Save, X } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import NeonHandle from "~/components/common/NeonHandle";

interface RetrieverNodeProps {
  data: any;
  id: string;
}

function RetrieverNode({ data, id }: RetrieverNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState(data);

  const handleDoubleClick = () => {
    setIsConfigMode(true);
  };

  const handleSaveConfig = (values: any) => {
    setNodes((nodes: any[]) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...values } } : node
      )
    );
    setIsConfigMode(false);
  };

  const handleCancelConfig = () => {
    setIsConfigMode(false);
  };

  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  // Simple validation function
  const validate = (values: any) => {
    const errors: any = {};
    if (!values.database_connection) {
      errors.database_connection = "Database connection is required";
    }
    if (!values.collection_name) {
      errors.collection_name = "Collection name is required";
    }
    if (!values.search_k || values.search_k < 1 || values.search_k > 50) {
      errors.search_k = "Search K must be between 1 and 50";
    }
    if (!values.search_type) {
      errors.search_type = "Search type is required";
    }
    if (
      !values.score_threshold ||
      values.score_threshold < 0 ||
      values.score_threshold > 1
    ) {
      errors.score_threshold = "Score threshold must be between 0 and 1";
    }
    return errors;
  };

  // Initial values
  const initialValues = {
    database_connection: configData?.database_connection || "",
    collection_name: configData?.collection_name || "",
    search_k: configData?.search_k || 6,
    search_type: configData?.search_type || "similarity",
    score_threshold: configData?.score_threshold || 0.0,
  };

  if (isConfigMode) {
    return (
      <div className="relative w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-medium">Retriever</span>
          </div>
          <Settings className="w-4 h-4 text-white" />
        </div>

        <Formik
          initialValues={initialValues}
          validate={validate}
          onSubmit={handleSaveConfig}
          enableReinitialize
        >
          {({ values, errors, touched, isSubmitting }) => (
            <Form className="space-y-3 w-full p-3">
              {/* Database Connection */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Database Connection
                </label>
                <Field
                  name="database_connection"
                  type="password"
                  className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <ErrorMessage
                  name="database_connection"
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
                  className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <ErrorMessage
                  name="collection_name"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>

              {/* Search Type */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Search Type
                </label>
                <Field
                  as="select"
                  name="search_type"
                  className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                >
                  <option value="similarity">Similarity Search</option>
                  <option value="mmr">MMR (Maximal Marginal Relevance)</option>
                </Field>
                <ErrorMessage
                  name="search_type"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>

              {/* Search K */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Search K
                </label>
                <Field
                  name="search_k"
                  type="range"
                  min={1}
                  max={50}
                  className="w-full text-white"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  <span>1</span>
                  <span className="font-bold text-blue-400">
                    {values.search_k}
                  </span>
                  <span>50</span>
                </div>
                <ErrorMessage
                  name="search_k"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>

              {/* Score Threshold */}
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Score Threshold
                </label>
                <Field
                  name="score_threshold"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full text-white"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  <span>0.0</span>
                  <span className="font-bold text-purple-400">
                    {values.score_threshold.toFixed(2)}
                  </span>
                  <span>1.0</span>
                </div>
                <ErrorMessage
                  name="score_threshold"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleCancelConfig}
                  className="text-xs px-2 py-1 bg-slate-700 rounded"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                >
                  ✕
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="text-xs px-2 py-1 bg-blue-600 rounded text-white"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
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

  return (
    <div className="relative group">
      {/* Ana node kutusu */}
      <div
        className={`relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br from-indigo-500 to-purple-600
          ${
            isHovered
              ? `shadow-2xl shadow-indigo-500/30`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Double click to configure"
      >
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
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <Search className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Settings icon */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
              <Settings className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Retriever"}
        </div>

        {/* Input Handles */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="embedder"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("embedder")}
          style={{
            top: "30%",
          }}
        />

        <NeonHandle
          type="target"
          position={Position.Left}
          id="reranker"
          isConnectable={true}
          size={10}
          color1="#f87171"
          glow={isHandleConnected("reranker")}
          style={{
            top: "70%",
          }}
        />

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="retriever_tool"
          isConnectable={true}
          size={10}
          color1="#818cf8"
          glow={isHandleConnected("retriever_tool", true)}
        />

        {/* Handle labels */}
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "25%" }}
        >
          Embedder
        </div>
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "65%" }}
        >
          Reranker
        </div>
        <div
          className="absolute -right-24 text-xs text-gray-500 font-medium"
          style={{ top: "45%" }}
        >
          Retriever Tool
        </div>

        {/* Database Type Badge */}
        {data?.database_connection && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg">
              <Database className="w-3 h-3 inline mr-1" />
              Database
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.connected && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-indigo-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RetrieverNode;
