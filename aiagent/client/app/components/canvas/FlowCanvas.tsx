import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Controls,
  Background,
  MiniMap,
} from "reactflow";
import { useSearchParams } from "react-router";
import ToolAgentNode from "./ToolAgentNode";
import StartNode from "./StartNode";
import CustomEdge from "./CustomEdge";
import ConditionNode from "./ConditionNode";
import GenericNode from "./GenericNode";
import { useWorkflows } from "~/stores/workflows";
import { useNodes } from "~/stores/nodes";
import type { WorkflowData, WorkflowNode, WorkflowEdge } from "~/types/api";
import StreamingModal from "./StreamingModal";
import WorkflowService from "~/services/workflows";

// Her node type için özel UI component haritası
const nodeTypeComponentMap: Record<string, any> = {
  ReactAgent: ToolAgentNode,
  ConditionNode: ConditionNode,
  StartNode: StartNode,
  // Buraya yeni node tiplerini ekleyebilirsin
};

// Base node/edge types always available
const baseNodeTypes = {
  toolAgent: ToolAgentNode,
  condition: ConditionNode,
  start: StartNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchParams] = useSearchParams();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodeId, setNodeId] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    currentWorkflow,
    fetchWorkflow,
    createWorkflow,
    updateWorkflow,
    executeWorkflow,
    validateWorkflow,
    setCurrentWorkflow,
    isLoading,
    isExecuting,
    error,
    executionResult,
    clearExecutionResult,
  } = useWorkflows();

  const { nodes: availableNodes } = useNodes();

  // Merge backend-provided node names into nodeTypes so React Flow can render them
  const nodeTypes = useMemo(() => {
    const map: Record<string, any> = { ...baseNodeTypes };
    availableNodes.forEach((n) => {
      map[n.name] = nodeTypeComponentMap[n.name] || GenericNode;
    });
    return map;
  }, [JSON.stringify(availableNodes.map((n) => n.name).sort())]);

  // Load workflow if ID is provided in URL
  useEffect(() => {
    const workflowId = searchParams.get("workflow");
    if (workflowId && workflowId !== currentWorkflow?.id) {
      fetchWorkflow(workflowId);
    }
  }, [searchParams, fetchWorkflow, currentWorkflow?.id]);

  // Load workflow data into the canvas
  useEffect(() => {
    if (currentWorkflow?.flow_data) {
      const flowData = currentWorkflow.flow_data;
      setNodes(flowData.nodes || []);
      setEdges(flowData.edges || []);
      setHasUnsavedChanges(false);
    }
  }, [currentWorkflow, setNodes, setEdges]);

  // Track changes for unsaved indicator
  useEffect(() => {
    if (currentWorkflow && (nodes.length > 0 || edges.length > 0)) {
      const currentFlowData = {
        nodes: nodes as WorkflowNode[],
        edges: edges as WorkflowEdge[],
      };

      const originalFlowData = currentWorkflow.flow_data;
      const hasChanges =
        JSON.stringify(currentFlowData) !== JSON.stringify(originalFlowData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [nodes, edges, currentWorkflow]);

  const onConnect = useCallback(
    (params: any) => {
      setEdges((eds) => addEdge({ ...params, type: "custom" }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeTypeData = event.dataTransfer.getData("application/reactflow");

      if (!nodeTypeData) {
        return;
      }

      const nodeType = JSON.parse(nodeTypeData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Find the node metadata from available nodes
      const nodeMetadata = availableNodes.find((n) => n.name === nodeType.type);

      const newNode: WorkflowNode = {
        id: `${nodeType.type}-${nodeId}`,
        type: nodeType.type,
        position,
        data: {
          name: nodeType.label,
          ...nodeType.data,
          // Include metadata for validation and execution
          metadata: nodeMetadata,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setNodeId((id) => id + 1);
    },
    [screenToFlowPosition, setNodes, nodeId, availableNodes]
  );

  const handleSave = useCallback(async () => {
    const flowData: WorkflowData = {
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
    };

    try {
      if (currentWorkflow) {
        // Update existing workflow
        await updateWorkflow(currentWorkflow.id, {
          flow_data: flowData,
        });
      } else {
        // Create new workflow
        const workflowName = `Workflow ${new Date().toLocaleString()}`;
        await createWorkflow({
          name: workflowName,
          description: "Created from canvas",
          flow_data: flowData,
        });
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save workflow:", error);
    }
  }, [nodes, edges, currentWorkflow, updateWorkflow, createWorkflow]);

  // Streaming execution for saved workflows
  const [stream, setStream] = useState<ReadableStream | null>(null);

  const handleExecuteStream = useCallback(async () => {
    if (!currentWorkflow) {
      alert("Please save the workflow first before streaming execution");
      return;
    }

    if (nodes.length === 0) {
      alert("Please add some nodes to execute the workflow");
      return;
    }

    // Prepare inputs – ask user for text input for now
    const inputText = prompt("Enter input text for the workflow:");
    if (!inputText) return;

    try {
      const streamResponse = await WorkflowService.executeWorkflowStream(currentWorkflow.id, {
        workflow_id: currentWorkflow.id,
        input_text: inputText,
      } as any);
      setStream(streamResponse);
    } catch (e) {
      console.error("Streaming execution error", e);
      alert("Streaming execution failed");
    }
  }, [currentWorkflow, nodes]);

  const closeStreamModal = () => setStream(null);

  const handleExecute = useCallback(async () => {
    if (nodes.length === 0) {
      alert("Please add some nodes to execute the workflow");
      return;
    }

    const flowData: WorkflowData = {
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
    };

    // Validate workflow first
    try {
      const validation = await validateWorkflow(flowData);
      if (!validation.valid) {
        alert(`Workflow validation failed:\n${validation.errors?.join("\n")}`);
        return;
      }
    } catch (error) {
      console.error("Validation error:", error);
      alert("Failed to validate workflow");
      return;
    }

    // Get input from user
    const inputText = prompt("Enter input text for the workflow:");
    if (!inputText) return;

    try {
      clearExecutionResult();
      const result = await executeWorkflow({
        flow_data: flowData,
        input_text: inputText,
      });

      // Show result in a modal or alert for now
      alert(
        `Execution completed!\n\nResult: ${JSON.stringify(
          result.result,
          null,
          2
        )}`
      );
    } catch (error) {
      console.error("Execution error:", error);
      alert("Workflow execution failed");
    }
  }, [nodes, edges, validateWorkflow, executeWorkflow, clearExecutionResult]);

  const handleClear = useCallback(() => {
    if (hasUnsavedChanges) {
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to clear the canvas?"
        )
      ) {
        return;
      }
    }
    setNodes([]);
    setEdges([]);
    setCurrentWorkflow(null);
    setHasUnsavedChanges(false);
  }, [setNodes, setEdges, setCurrentWorkflow, hasUnsavedChanges]);

  return (
    <div className="flex-1 h-full relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border p-2 flex gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className={`px-3 py-1 text-sm rounded ${
            hasUnsavedChanges
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-600"
          } disabled:opacity-50`}
        >
          {isLoading ? "Saving..." : hasUnsavedChanges ? "Save*" : "Saved"}
        </button>

        <button
          onClick={handleExecuteStream}
          disabled={nodes.length === 0}
          className="px-3 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          Stream
        </button>
        
        <button
          onClick={handleExecute}
          disabled={isExecuting || nodes.length === 0}
          className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isExecuting ? "Executing..." : "Execute"}
        </button>

        <button
          onClick={handleClear}
          className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
        >
          Clear
        </button>
      </div>

      {/* Workflow Info */}
      {currentWorkflow && (
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg border p-3 max-w-xs">
          <h3 className="font-medium text-gray-900">{currentWorkflow.name}</h3>
          {currentWorkflow.description && (
            <p className="text-sm text-gray-600 mt-1">
              {currentWorkflow.description}
            </p>
          )}
          <div className="text-xs text-gray-500 mt-2">
            {nodes.length} nodes, {edges.length} connections
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-20 left-4 z-10 bg-red-50 border border-red-200 rounded-lg p-3 max-w-md">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Execution Result */}
      {executionResult && (
        <div className="absolute bottom-4 left-4 z-10 bg-green-50 border border-green-200 rounded-lg p-3 max-w-md">
          <div className="text-green-800 text-sm">
            <strong>Execution Result:</strong>
            <pre className="mt-1 text-xs overflow-auto max-h-32">
              {JSON.stringify(executionResult, null, 2)}
            </pre>
          </div>
          <button
            onClick={clearExecutionResult}
            className="mt-2 text-xs text-green-600 hover:text-green-800"
          >
            Close
          </button>
        </div>
      )}

      <div
        ref={reactFlowWrapper}
        className="w-full h-full"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="bg-gray-50"
        >
          <Controls position="top-right" />
          <Background gap={20} size={1} />
          <MiniMap />
        </ReactFlow>
      </div>

      {stream && <StreamingModal stream={stream} onClose={closeStreamModal} />}
    </div>
  );
}

export default FlowCanvas;
