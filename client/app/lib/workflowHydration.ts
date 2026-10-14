import type { CustomNode, NodeMetadata, WorkflowData } from "~/types/api";

type NodeDefinition = NodeMetadata | CustomNode;

const intrinsicNodeTypes = new Set(["StartNode", "EndNode", "StickyNoteNode"]);

/** Prepare a saved graph without silently discarding nodes or connections. */
export function hydrateWorkflowGraph(
  flowData: WorkflowData,
  definitions: NodeDefinition[],
): WorkflowData {
  if (!Array.isArray(flowData?.nodes) || !Array.isArray(flowData?.edges)) {
    throw new Error("Workflow data must contain nodes and edges arrays.");
  }

  const definitionsByType = new Map<string, NodeDefinition>();
  for (const definition of definitions) {
    if (!definitionsByType.has(definition.name)) {
      definitionsByType.set(definition.name, definition);
    }
    if ("id" in definition && !definitionsByType.has(definition.id)) {
      definitionsByType.set(definition.id, definition);
    }
  }

  const nodeIds = new Set<string>();
  const missingTypes = new Set<string>();
  const nodes = flowData.nodes.map((node) => {
    if (!node || typeof node.id !== "string" || !node.id ||
        typeof node.type !== "string" || !node.type || nodeIds.has(node.id) ||
        !node.position || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y) ||
        !node.data || typeof node.data !== "object" || Array.isArray(node.data)) {
      throw new Error("Workflow contains an invalid or duplicate node ID/type.");
    }
    nodeIds.add(node.id);

    const definition = definitionsByType.get(node.type);
    if (!definition) {
      if (!intrinsicNodeTypes.has(node.type)) {
        missingTypes.add(node.type);
      }
      return node;
    }

    const metadata = definition as NodeMetadata;
    return {
      ...node,
      data: {
        ...(node.data || {}),
        metadata: definition,
        ...(metadata.icon !== undefined ? { icon: metadata.icon } : {}),
        ...(metadata.description !== undefined ? { description: metadata.description } : {}),
        ...(metadata.display_name !== undefined ? { displayName: metadata.display_name } : {}),
        ...(metadata.inputs !== undefined ? { inputs: metadata.inputs } : {}),
        ...(metadata.outputs !== undefined ? { outputs: metadata.outputs } : {}),
      },
    };
  });

  if (missingTypes.size > 0) {
    throw new Error(`Node definitions are unavailable: ${[...missingTypes].join(", ")}. The workflow was not opened to protect its connections.`);
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const visibleHandles = (nodeId: string, kind: "source" | "target"): string[] => {
    const node = nodesById.get(nodeId)!;
    if (node.type === "StartNode") return kind === "source" ? ["output"] : [];
    if (node.type === "EndNode") return kind === "target" ? ["target"] : [];
    const handles = kind === "source"
      ? node.data?.outputs || node.data?.metadata?.outputs
      : node.data?.inputs || node.data?.metadata?.inputs;
    return Array.isArray(handles)
      ? handles.filter((handle) => handle?.is_connection === true).map((handle) => handle.name)
      : [];
  };

  const edgeIds = new Set<string>();
  for (const edge of flowData.edges) {
    if (!edge || typeof edge.source !== "string" || typeof edge.target !== "string" ||
        !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error("Workflow contains a connection to a missing node. No connections were discarded.");
    }
    if (typeof edge.id !== "string" || !edge.id || edgeIds.has(edge.id)) {
      throw new Error("Workflow contains an invalid or duplicate connection ID.");
    }
    edgeIds.add(edge.id);
    const sourceHandles = visibleHandles(edge.source, "source");
    const targetHandles = visibleHandles(edge.target, "target");
    if (sourceHandles.length === 0 || targetHandles.length === 0 ||
        (edge.sourceHandle && !sourceHandles.includes(edge.sourceHandle)) ||
        (edge.targetHandle && !targetHandles.includes(edge.targetHandle))) {
      throw new Error(`Workflow connection ${edge.id || `${edge.source} → ${edge.target}`} uses a node port that is unavailable in the current node definitions.`);
    }
  }

  return { ...flowData, nodes, edges: flowData.edges };
}
