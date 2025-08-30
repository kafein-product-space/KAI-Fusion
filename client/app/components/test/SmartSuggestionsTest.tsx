import React from "react";
import { useSmartSuggestions } from "~/stores/smartSuggestions";
import { SmartSuggestionsService } from "~/services/smartSuggestions";

const SmartSuggestionsTest: React.FC = () => {
  const {
    lastAddedNode,
    recommendedNodes,
    isEnabled,
    setLastAddedNode,
    updateRecommendations,
    clearRecommendations,
  } = useSmartSuggestions();

  const testNodes = [
    {
      name: "WebScraper",
      display_name: "Web Scraper",
      description: "Test web scraper",
      category: "document_loaders",
      inputs: [],
      outputs: [],
    },
    {
      name: "ChunkSplitter",
      display_name: "Chunk Splitter",
      description: "Test chunk splitter",
      category: "splitters",
      inputs: [],
      outputs: [],
    },
    {
      name: "OpenAIEmbeddings",
      display_name: "OpenAI Embeddings",
      description: "Test OpenAI embeddings",
      category: "embeddings",
      inputs: [],
      outputs: [],
    },
    {
      name: "PGVectorStore",
      display_name: "PostgreSQL Vector Store",
      description: "Test PostgreSQL vector store",
      category: "vectorstores",
      inputs: [],
      outputs: [],
    },
    {
      name: "RetrieverNode",
      display_name: "Retriever",
      description: "Test retriever node",
      category: "tools",
      inputs: [],
      outputs: [],
    },
    {
      name: "OpenAIChat",
      display_name: "OpenAI Chat",
      description: "Test OpenAI chat",
      category: "llms",
      inputs: [],
      outputs: [],
    },
    {
      name: "EndNode",
      display_name: "End Node",
      description: "Test end node",
      category: "special",
      inputs: [],
      outputs: [],
    },
  ];

  const handleTestNode = (nodeType: string) => {
    setLastAddedNode(nodeType);
    updateRecommendations(testNodes);
  };

  const availableChains = SmartSuggestionsService.getAvailableChains();

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white font-bold mb-4">Smart Suggestions Test</h3>

      <div className="space-y-4">
        {/* Status */}
        <div className="p-3 bg-gray-700 rounded">
          <p className="text-white text-sm">
            <strong>Enabled:</strong> {isEnabled ? "Yes" : "No"}
          </p>
          <p className="text-white text-sm">
            <strong>Last Added Node:</strong> {lastAddedNode || "None"}
          </p>
          <p className="text-white text-sm">
            <strong>Recommended Nodes:</strong> {recommendedNodes.length}
          </p>
        </div>

        {/* Test Buttons */}
        <div className="space-y-2">
          <h4 className="text-white font-medium">Test Node Addition:</h4>
          <div className="flex flex-wrap gap-2">
            {testNodes.map((node) => (
              <button
                key={node.name}
                onClick={() => handleTestNode(node.name)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
              >
                {node.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Available Chains */}
        <div className="space-y-2">
          <h4 className="text-white font-medium">Available Chains:</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {availableChains.map((chain, index) => (
              <div
                key={index}
                className="text-xs text-gray-300 p-2 bg-gray-700 rounded"
              >
                <strong>{chain.trigger}</strong> →{" "}
                {chain.recommendations.join(", ")}
                <br />
                <span className="text-gray-400">{chain.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-white font-medium">Actions:</h4>
          <div className="flex gap-2">
            <button
              onClick={clearRecommendations}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
            >
              Clear Recommendations
            </button>
            <button
              onClick={() => setLastAddedNode(null)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
            >
              Clear Last Node
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSuggestionsTest;
