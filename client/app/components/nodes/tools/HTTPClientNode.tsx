import React, { useRef, useState } from "react";
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
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";

interface HTTPClientNodeProps {
  data: any;
  id: string;
}

function HTTPClientNode({ data, id }: HTTPClientNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState(data);

  const handleDoubleClick = () => {
    setIsConfigMode(true);
  };

  const handleSaveConfig = () => {
    setNodes((nodes: any[]) =>
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
        return "from-emerald-500 to-teal-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-purple-600";
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
      {/* Config Mode */}
      {isConfigMode ? (
        <div
          className={`relative w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center 
            cursor-pointer transition-all duration-300 transform
            bg-gradient-to-br from-blue-500 to-purple-600
            shadow-2xl shadow-cyan-500/30
            border border-white/20 backdrop-blur-sm`}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-medium">
                HTTP Client
              </span>
            </div>
            <Settings className="w-4 h-4 text-white" />
          </div>

          {/* Config Form */}
          <div className="w-full p-3">
            <Formik
              initialValues={{
                method: configData.method || "GET",
                url: configData.url || "",
                headers: configData.headers || "{}",
                body: configData.body || "",
                timeout: configData.timeout || 30,
                max_retries: configData.max_retries || 3,
              }}
              enableReinitialize
              validate={(values) => {
                const errors: any = {};
                if (!values.url) {
                  errors.url = "URL is required";
                }
                if (!values.method) {
                  errors.method = "Method is required";
                }
                if (values.timeout < 1 || values.timeout > 300) {
                  errors.timeout = "Timeout must be between 1 and 300";
                }
                if (values.max_retries < 0 || values.max_retries > 10) {
                  errors.max_retries = "Max retries must be between 0 and 10";
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
                  {/* Method Selection */}
                  <div>
                    <label className="text-white text-xs font-medium mb-1 block">
                      HTTP Method
                    </label>
                    <Field
                      name="method"
                      as="select"
                      className={`w-full bg-slate-900/80 border rounded-lg text-white px-2 py-1 placeholder-slate-400 focus:ring-1 transition-all text-xs ${
                        errors.method && touched.method
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-600/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                      }`}
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    >
                      <option value="GET">GET ⭐</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                      <option value="HEAD">HEAD</option>
                    </Field>
                    <ErrorMessage
                      name="method"
                      component="div"
                      className="text-red-400 text-xs mt-1"
                    />
                  </div>

                  {/* URL */}
                  <div>
                    <label className="text-white text-xs font-medium mb-1 block">
                      URL
                    </label>
                    <Field
                      name="url"
                      type="text"
                      placeholder="https://api.example.com/endpoint"
                      className={`w-full bg-slate-900/80 border rounded-lg text-white px-2 py-1 placeholder-slate-400 focus:ring-1 transition-all text-xs ${
                        errors.url && touched.url
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-600/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                      }`}
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    />
                    <ErrorMessage
                      name="url"
                      component="div"
                      className="text-red-400 text-xs mt-1"
                    />
                  </div>

                  {/* Headers */}
                  <div>
                    <label className="text-white text-xs font-medium mb-1 block">
                      Headers (JSON)
                    </label>
                    <Field
                      name="headers"
                      as="textarea"
                      placeholder='{"Content-Type": "application/json"}'
                      rows={2}
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-2 py-1 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-xs"
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="text-white text-xs font-medium mb-1 block">
                      Request Body
                    </label>
                    <Field
                      name="body"
                      as="textarea"
                      placeholder='{"key": "value"}'
                      rows={2}
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-2 py-1 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-xs"
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    />
                  </div>

                  {/* Timeout */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-white text-xs font-medium">
                        Timeout (s)
                      </label>
                      <span className="text-cyan-400 text-xs font-bold">
                        {values.timeout}
                      </span>
                    </div>
                    <Field
                      name="timeout"
                      type="range"
                      min={1}
                      max={300}
                      step={1}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                          (values.timeout - 1) * 0.33
                        }%, #374151 ${
                          (values.timeout - 1) * 0.33
                        }%, #374151 100%)`,
                      }}
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>1</span>
                      <span>300</span>
                    </div>
                    <ErrorMessage
                      name="timeout"
                      component="div"
                      className="text-red-400 text-xs mt-1"
                    />
                  </div>

                  {/* Max Retries */}
                  <div>
                    <label className="text-white text-xs font-medium mb-1 block">
                      Max Retries
                    </label>
                    <Field
                      name="max_retries"
                      type="number"
                      placeholder="3"
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-2 py-1 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-xs"
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    />
                    <ErrorMessage
                      name="max_retries"
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
          </div>
        </div>
      ) : (
        /* Normal Mode */
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
              <ArrowUpCircle className="w-10 h-10 text-white drop-shadow-lg" />
              {/* Activity indicator - HTTP method badge */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <Globe className="w-2 h-2 text-white" />
              </div>
            </div>
          </div>

          {/* Node title */}
          <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
            {data?.displayName || data?.name || "HTTP Client"}
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
            position={Position.Right}
            id="output"
            isConnectable={true}
            size={10}
            color1="#00FFFF"
            glow={isHandleConnected("output", true)}
          />

          {/* HTTP Method Badge */}
          {data?.method && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
                {data.method}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default HTTPClientNode;
