export type CanvasExecutionStatus = "success" | "failed" | "pending" | "unknown" | "cancelled";

/** An animation change must never erase another branch's execution history. */
export function markActiveExecutionEdges(
  current: Record<string, CanvasExecutionStatus>,
  edgeIds: readonly string[],
): Record<string, CanvasExecutionStatus> {
  if (edgeIds.length === 0) return current;
  const next = { ...current };
  for (const edgeId of edgeIds) {
    // A delayed or replayed start event must not undo a terminal observation.
    // A new run starts with a fresh status map, so this does not affect it.
    if (edgeId && (next[edgeId] === undefined || next[edgeId] === "pending")) {
      next[edgeId] = "pending";
    }
  }
  return next;
}

export function cancelPendingExecutionEdges(
  current: Record<string, CanvasExecutionStatus>,
): Record<string, CanvasExecutionStatus> {
  return Object.fromEntries(
    Object.entries(current).map(([edgeId, status]) => [
      edgeId,
      status === "pending" ? "cancelled" : status,
    ]),
  );
}

/** Final reconciliation never confuses an unreported active edge with idle. */
export function mergeReportedEdgeStatuses(
  current: Record<string, CanvasExecutionStatus>,
  reported: unknown,
  fallbackEdgeIds: readonly string[] = [],
  fallbackStatus: CanvasExecutionStatus = "success",
): Record<string, CanvasExecutionStatus> {
  const next = { ...current };
  for (const [edgeId, status] of Object.entries(next)) {
    if (status === "pending") next[edgeId] = "unknown";
  }
  if (reported && typeof reported === "object") {
    for (const [edgeId, status] of Object.entries(reported as Record<string, unknown>)) {
      if (status === "pending" || status === "success" || status === "failed") {
        next[edgeId] = status;
      }
    }
  }
  for (const edgeId of fallbackEdgeIds) {
    if (!(edgeId in next) || next[edgeId] === "unknown") {
      next[edgeId] = fallbackStatus;
    }
  }
  return next;
}

type CanvasNodeLike = {
  id: string;
  type?: string;
};

type CanvasEdgeLike = {
  id: string;
};

/**
 * A node only reflects its own execution. A provider/sub-node must never inherit
 * the status of a downstream agent: an agent may catch a provider error, and a
 * provider may succeed even when the agent later fails.
 */
export function getEffectiveNodeStatus(
  nodeId: string,
  nodeStatus: Record<string, CanvasExecutionStatus>,
  _nodes: CanvasNodeLike[],
  _edges: CanvasEdgeLike[]
): CanvasExecutionStatus | undefined {
  return nodeStatus[nodeId];
}

/**
 * Edge lifecycle is reported explicitly by the execution stream. Handle names
 * and node types are deliberately not used as execution semantics.
 */
export function getEdgeExecutionStatus(
  edge: CanvasEdgeLike,
  edgeStatus: Record<string, CanvasExecutionStatus> = {}
): CanvasExecutionStatus | undefined {
  return edgeStatus[edge.id];
}
