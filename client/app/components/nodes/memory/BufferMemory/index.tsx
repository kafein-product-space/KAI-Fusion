import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import BufferMemoryConfigForm from "./BufferMemoryConfigForm";
import BufferMemoryDisplay from "./BufferMemoryDisplay";

export default function BufferMemoryNode({
  data,
  id,
}: {
  data: any;
  id: string;
}) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState(data);
  const edges = getEdges();

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((e) =>
      isSource
        ? e.source === id && e.sourceHandle === handleId
        : e.target === id && e.targetHandle === handleId
    );

  const getStatusColor = () => {
    switch (data?.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-indigo-600";
    }
  };

  const getGlowColor = () => {
    switch (data?.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-blue-500/30";
    }
  };

  const handleSave = (newData: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    setIsConfigMode(false);
  };

  const handleDelete = (e: any) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
  };

  return isConfigMode ? (
    <BufferMemoryConfigForm
      configData={configData}
      onSave={handleSave}
      onCancel={() => setIsConfigMode(false)}
    />
  ) : (
    <BufferMemoryDisplay
      data={data}
      isHovered={isHovered}
      onDoubleClick={() => setIsConfigMode(true)}
      onHoverEnter={() => setIsHovered(true)}
      onHoverLeave={() => setIsHovered(false)}
      onDelete={handleDelete}
      isHandleConnected={isHandleConnected}
      getStatusColor={getStatusColor}
      getGlowColor={getGlowColor}
    />
  );
}
