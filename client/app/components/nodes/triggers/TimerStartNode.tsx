import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Clock, Trash } from "lucide-react";
import TimerStartConfigModal from "~/components/modals/triggers/TimerStartConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface TimerStartNodeProps {
  data: any;
  id: string;
}

function TimerStartNode({ data, id }: TimerStartNodeProps) {
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

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`w-24 h-24 rounded-xl flex items-center justify-center gap-3 px-4 py-4 border-2 text-gray-700 font-medium cursor-pointer transition-all
          ${
            data.validationStatus === "success"
              ? "border-green-500"
              : data.validationStatus === "error"
              ? "border-red-500"
              : "border-green-400"
          }
          bg-green-50 hover:bg-green-100`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="rounded-2xl">
          <Clock className="w-8 h-8 text-green-600" />
        </div>
        {isHovered && (
          <button
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center z-10"
            onClick={handleDeleteNode}
            title="Delete Node"
          >
            <Trash size={8} />
          </button>
        )}
        <div
          className="absolute text-xs text-green-700 font-medium pointer-events-none whitespace-nowrap"
          style={{
            bottom: "-30%",
            transform: "translateY(-50%)",
          }}
        >
          {data?.displayName || data?.name || "Timer Start"}
        </div>

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="timer_data"
          isConnectable={true}
          color1="#10b981"
          glow={isHandleConnected("timer_data", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "40%",
            transform: "translateY(-50%)",
          }}
          title="Timer Data"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="schedule_info"
          isConnectable={true}
          color1="#10b981"
          glow={isHandleConnected("schedule_info", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "60%",
            transform: "translateY(-50%)",
          }}
          title="Schedule Info"
        />
      </div>

      {/* Modal */}
      <TimerStartConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default TimerStartNode;
