import { ReactFlowProvider } from "@xyflow/react";
import FlowCanvas from "../components/canvas/FlowCanvas";

import ErrorBoundary from "../components/common/ErrorBoundary";
import "@xyflow/react/dist/style.css";
import { useLocation } from "react-router";
import AuthGuard from "~/components/AuthGuard";

export default function App() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const workflowId = searchParams.get("workflow");

  return (
    <AuthGuard>
      <ErrorBoundary>
        <ReactFlowProvider>
          <div className="w-full h-screen flex flex-col">
            <div className="flex-1 flex">
              <FlowCanvas workflowId={workflowId || undefined} />
            </div>
          </div>
        </ReactFlowProvider>
      </ErrorBoundary>
    </AuthGuard>
  );
}
