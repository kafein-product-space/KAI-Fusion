import { ReactFlowProvider } from "@xyflow/react";
import FlowCanvas from "../components/canvas/FlowCanvas";
import { AuthGuard } from "../components/AuthGuard";
import ErrorBoundary from "../components/common/ErrorBoundary";
import "@xyflow/react/dist/style.css";
export default function App() {
  return (
    <AuthGuard>
      <ErrorBoundary>
        <ReactFlowProvider>
          <div className="w-full h-screen flex flex-col">
            <div className="flex-1 flex">
              <FlowCanvas />
            </div>
          </div>
        </ReactFlowProvider>
      </ErrorBoundary>
    </AuthGuard>
  );
}
