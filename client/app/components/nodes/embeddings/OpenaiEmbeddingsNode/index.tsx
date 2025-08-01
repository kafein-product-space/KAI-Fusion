// OpenAIEmbeddingsNode/index.tsx
import { useReactFlow } from "@xyflow/react";
import { useState } from "react";
import EmbeddingsDisplay from "./EmbeddingsDisplay";
import EmbeddingsConfigForm from "./EmbeddingsConfigForm";

interface OpenAIEmbeddingsNodeProps {
  data: any;
  id: string;
}

export default function OpenAIEmbeddingsNode({
  data,
  id,
}: OpenAIEmbeddingsNodeProps) {
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

  const handleSave = (newConfig: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newConfig } }
          : node
      )
    );
    setIsConfigMode(false);
  };

  return (
    <>
      {isConfigMode ? (
        <EmbeddingsConfigForm
          configData={configData}
          onCancel={() => {
            setConfigData(data);
            setIsConfigMode(false);
          }}
          onSave={handleSave}
        />
      ) : (
        <EmbeddingsDisplay
          data={data}
          isHovered={isHovered}
          onDoubleClick={() => setIsConfigMode(true)}
          onHoverEnter={() => setIsHovered(true)}
          onHoverLeave={() => setIsHovered(false)}
          isHandleConnected={isHandleConnected}
        />
      )}
    </>
  );
}
