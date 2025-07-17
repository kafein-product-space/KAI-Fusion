import { ReactFlowProvider } from "@xyflow/react";
import FlowCanvas from "../components/canvas/FlowCanvas";
import { AuthGuard } from "../components/AuthGuard";
import ErrorBoundary from "../components/common/ErrorBoundary";
import "@xyflow/react/dist/style.css";
import { useParams } from "react-router";

export default function App() {
  const { id } = useParams();
  console.log("id", id);

  return (
    <AuthGuard>
      <ErrorBoundary>
        <ReactFlowProvider>
          <div className="w-full h-screen flex flex-col">
            <div className="flex-1 flex">
              <FlowCanvas workflowId={id} />
            </div>
          </div>
        </ReactFlowProvider>
      </ErrorBoundary>
    </AuthGuard>
  );
}
