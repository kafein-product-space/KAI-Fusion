import { useReactFlow } from "@xyflow/react";
import { useState } from "react";
import ChatConfigForm from "./ChatConfigForm";
import ChatDisplayNode from "./ChatDisplayNode";

export default function OpenAIChatNode({
  data,
  id,
  isActive,
}: {
  data: any;
  id: string;
  isActive?: boolean;
}) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState(data);

  const edges = getEdges();

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    if (isActive) {
      return "from-green-400 to-emerald-500";
    }
    switch (data?.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-purple-500 to-indigo-600";
    }
  };

  const getGlowColor = () => {
    if (isActive) {
      return "shadow-green-400/70";
    }
    switch (data?.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-purple-500/30";
    }
  };

  const handleSaveConfig = (newValues: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newValues } }
          : node
      )
    );
    setIsConfigMode(false);
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return isConfigMode ? (
    <ChatConfigForm
      configData={configData}
      onCancel={() => setIsConfigMode(false)}
      onSave={handleSaveConfig}
    />
  ) : (
    <ChatDisplayNode
      data={data}
      isHovered={isHovered}
      onDoubleClick={() => setIsConfigMode(true)}
      onHoverEnter={() => setIsHovered(true)}
      onHoverLeave={() => setIsHovered(false)}
      onDelete={handleDeleteNode}
      isHandleConnected={isHandleConnected}
      getStatusColor={getStatusColor}
      getGlowColor={getGlowColor}
      isActive={isActive}
    />
  );
}
