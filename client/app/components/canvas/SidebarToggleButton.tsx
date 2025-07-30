import React from "react";
import { Plus, Minus } from "lucide-react";

interface SidebarToggleButtonProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export default function SidebarToggleButton({
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarToggleButtonProps) {
  return (
    <button
      className="fixed top-20 left-2 shadow-xl z-30 bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 m-3 transition-all duration-200"
      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
    >
      {isSidebarOpen ? (
        <Minus className="w-6 h-6" />
      ) : (
        <Plus className="w-6 h-6" />
      )}
    </button>
  );
}
