import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import FlowCanvas from "../components/canvas/FlowCanvas";
import { AuthGuard } from "../components/AuthGuard";
import ErrorBoundary from "../components/common/ErrorBoundary";
import "@xyflow/react/dist/style.css";
import ChatPanel from "../components/common/ChatPanel";

export default function App() {
  return (
    <AuthGuard>
      <ErrorBoundary>
        <ReactFlowProvider>
          <div className="w-full h-screen flex flex-col">
            <div className="flex-1 flex">
              <FlowCanvas />
              <ChatPanel />
            </div>
          </div>
        </ReactFlowProvider>
      </ErrorBoundary>
    </AuthGuard>
  );
}
