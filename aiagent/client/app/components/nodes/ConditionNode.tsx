import React, { useState } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import {
  GitBranch,
  Settings,
  CheckCircle,
  AlertCircle,
  Trash2,
  Info,
  Split,
} from "lucide-react";
import ConditionConfigModal from "../modals/ConditionConfigModal";

interface ConditionNodeProps {
  data: any;
  id: string;
}

function ConditionNode({ data, id }: ConditionNodeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const handleDoubleClick = () => {
    setIsModalOpen(true);
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

  const getStatusColor = () => {
    if (
      data?.conditions?.length > 0 &&
      data?.conditions?.every((c: any) => c.value1 && c.value2)
    ) {
      return "border-green-400 bg-green-100 hover:bg-green-200";
    }
    return "border-orange-400 bg-orange-100 hover:bg-orange-200";
  };

  const getStatusIcon = () => {
    if (
      data?.conditions?.length > 0 &&
      data?.conditions?.every((c: any) => c.value1 && c.value2)
    ) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-orange-600" />;
  };

  return (
    <>
      <div
        className={`relative flex items-center gap-3 px-6 py-4 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all ${getStatusColor()}`}
        onDoubleClick={handleDoubleClick}
        title="Çift tıklayarak konfigüre edin"
      >
        {/* Sil & Info Butonları */}
        <div className="absolute top-1 right-1 flex gap-1 z-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNodes((nodes) => nodes.filter((n) => n.id !== id));
            }}
            className="p-1 bg-red-100 hover:bg-red-200 rounded-md"
            title="Sil"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(
                `Node adı: ${data?.name || "Condition"}\nKural sayısı: ${
                  data?.conditions?.length || 0
                }`
              );
            }}
            className="p-1 bg-blue-100 hover:bg-blue-200 rounded-md"
            title="Bilgi"
          >
            <Info className="w-4 h-4 text-blue-600" />
          </button>
        </div>

        <div className="bg-yellow-500 p-3 rounded-lg">
          <Split className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{data?.name || "Condition"}</p>
            {getStatusIcon()}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {data?.conditions?.length > 0
              ? `${data.conditions.length} kural tanımlı`
              : "Konfigürasyon gerekli"}
          </div>
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-3 h-3 !bg-teal-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          style={{ top: "40%" }}
          className="w-3 h-3 bg-green-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ top: "60%" }}
          className="w-3 h-3 bg-red-500"
        />
      </div>

      <ConditionConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        nodeData={data}
        onSave={handleConfigSave}
      />
    </>
  );
}

// Condition Config Modal Component

export default ConditionNode;
