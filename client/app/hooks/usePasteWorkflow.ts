import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";

export function usePasteWorkflow() {
  const { addNodes, addEdges } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData("text");
      if (!pastedText) return;

      try {
        const parsed = JSON.parse(pastedText);

        if (parsed.nodes && parsed.edges) {
          const newId = () => Math.random().toString(36).substring(2, 9);
          const idMap: Record<string, string> = {};

          const newNodes = parsed.nodes.map((node: any) => {
            const id = newId();
            idMap[node.id] = id;

            return {
              ...node,
              id,
              position: {
                x: node.position.x + 30,
                y: node.position.y + 30,
              },
            };
          });

          const newEdges = parsed.edges.map((edge: any) => ({
            ...edge,
            id: newId(),
            source: idMap[edge.source],
            target: idMap[edge.target],
          }));

          addNodes(newNodes);
          addEdges(newEdges);

          // ✅ Snackbar bildirimi
          enqueueSnackbar("Workflow pasted successfully!", {
            variant: "success",
          });
        }
      } catch (err) {
        enqueueSnackbar("Invalid workflow JSON", { variant: "error" });
        console.warn("Pasted content is not valid workflow JSON.", err);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);
}
