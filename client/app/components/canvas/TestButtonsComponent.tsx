import React from "react";

interface TestButtonsComponentProps {
  edges: any[];
  setActiveEdges: (edges: string[]) => void;
  animateExecution: () => void;
}

export default function TestButtonsComponent({
  edges,
  setActiveEdges,
  animateExecution,
}: TestButtonsComponentProps) {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-3">
      <button
        className="bg-yellow-400 text-black px-5 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-yellow-500 transition-all"
        onClick={() => {
          if (edges.length > 0) {
            const randomEdge = edges[Math.floor(Math.random() * edges.length)];
            setActiveEdges([randomEdge.id]);
            setTimeout(() => setActiveEdges([]), 2000); // 2 saniye sonra efekti kaldır
          }
        }}
      >
        Elektrik Test
      </button>
      <button
        className="bg-green-500 text-white px-5 py-2 rounded-full shadow-lg hover:bg-green-600 transition-all"
        onClick={animateExecution}
      >
        Workflow Execute Test
      </button>
    </div>
  );
}
