import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { MessageCircle, Trash, Settings, Zap, Database } from "lucide-react";
import RetrievalQAConfigModal from "../../modals/chains/RetrievalQAConfigModal";
import NeonHandle from "../../common/NeonHandle";

interface RetrievalQANodeProps {
  data: any;
  id: string;
}

function RetrievalQANode({ data, id }: RetrievalQANodeProps) {
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
      {/* Ana node kutusu */}
      <div
        className={`relative group w-32 h-32 rounded-2xl flex flex-col items-center justify-center 
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
            <MessageCircle className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Zap className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "RAG QA"}
        </div>

        {/* Status indicator */}
        <div className="absolute top-2 right-2 z-20">
          <div
            className={`w-2 h-2 rounded-full ${
              data.validationStatus === "success"
                ? "bg-emerald-400"
                : data.validationStatus === "error"
                ? "bg-red-400"
                : "bg-blue-400"
            } shadow-lg`}
          ></div>
        </div>

        {/* Hover effects */}
        {isHovered && (
          <>
            {/* Settings button */}
            <button
              className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-8 
                bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={handleOpenModal}
              title="Configure Node"
            >
              <Settings size={14} />
            </button>

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

        {/* Connection indicators */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-center space-x-1">
          <div
            className={`w-1 h-1 rounded-full transition-all ${
              isHandleConnected("retriever")
                ? "bg-cyan-400 shadow-cyan-400/50 shadow-sm"
                : "bg-gray-600"
            }`}
          ></div>
          <div
            className={`w-1 h-1 rounded-full transition-all ${
              isHandleConnected("question")
                ? "bg-cyan-400 shadow-cyan-400/50 shadow-sm"
                : "bg-gray-600"
            }`}
          ></div>
          <div
            className={`w-1 h-1 rounded-full transition-all ${
              isHandleConnected("answer", true)
                ? "bg-blue-400 shadow-blue-400/50 shadow-sm"
                : "bg-gray-600"
            }`}
          ></div>
        </div>

        {/* Input Handles */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="retriever"
          isConnectable={true}
          color1="#00FFFF"
          glow={isHandleConnected("retriever")}
          className="absolute w-4 h-4 transition-all z-20 border-2 border-white/30"
          style={{
            left: -8,
            top: "60%",
            transform: "translateY(-50%)",
            background: "linear-gradient(135deg, #00FFFF, #0080FF)",
            borderRadius: "50%",
            boxShadow: isHandleConnected("retriever")
              ? "0 0 15px #00FFFF, 0 0 25px #00FFFF50"
              : "0 0 8px rgba(0,0,0,0.5)",
          }}
          title="Retriever (Required)"
        />

        {/* Question handle with icon indicator */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20">
          <Database className="w-3 h-3 text-cyan-400 mb-1 drop-shadow-lg" />
          <NeonHandle
            type="target"
            position={Position.Top}
            id="question"
            isConnectable={true}
            color1="#00FFFF"
            glow={isHandleConnected("question")}
            className="w-4 h-4 transition-all border-2 border-white/30"
            style={{
              background: "linear-gradient(135deg, #00FFFF, #0080FF)",
              borderRadius: "50%",
              boxShadow: isHandleConnected("question")
                ? "0 0 15px #00FFFF, 0 0 25px #00FFFF50"
                : "0 0 8px rgba(0,0,0,0.5)",
            }}
            title="Question (Required)"
          />
        </div>

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="answer"
          isConnectable={true}
          color1="#0ea5e9"
          glow={isHandleConnected("answer", true)}
          className="absolute w-4 h-4 transition-all z-20 border-2 border-white/30"
          style={{
            right: -8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
            borderRadius: "50%",
            boxShadow: isHandleConnected("answer", true)
              ? "0 0 15px #0ea5e9, 0 0 25px #0ea5e950"
              : "0 0 8px rgba(0,0,0,0.5)",
          }}
          title="Answer"
        />

        {/* Animated border */}
        <div
          className={`absolute inset-0 rounded-2xl border-2 border-transparent
          ${isHovered ? "animate-pulse" : ""}
          bg-gradient-to-r ${getStatusColor()} opacity-20`}
          style={{
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "xor",
          }}
        ></div>
      </div>

      {/* Modal */}
      <RetrievalQAConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default RetrievalQANode;
