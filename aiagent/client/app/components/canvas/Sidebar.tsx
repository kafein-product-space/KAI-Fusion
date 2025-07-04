import React, { useEffect, useState } from "react";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import DraggableNode from "./DraggableNode";
import { useNodes } from "~/stores/nodes";

// Loading Component
const LoadingNodes = () => (
  <div className="p-4 text-center">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
    <p className="text-sm text-gray-600">Loading nodes...</p>
  </div>
);

// Error Component
const ErrorNodes = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div className="p-4 text-center">
    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
    <p className="text-sm text-gray-600 mb-2">{error}</p>
    <button
      onClick={onRetry}
      className="text-sm text-purple-600 hover:text-purple-700 flex items-center mx-auto"
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      Retry
    </button>
  </div>
);

function Sidebar() {
  const {
    nodes,
    categories,
    filteredNodes,
    selectedCategory,
    searchQuery,
    isLoading,
    error,
    fetchNodes,
    fetchCategories,
    filterByCategory,
    searchNodes,
    clearError,
  } = useNodes();

  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // Fetch nodes and categories on component mount
  useEffect(() => {
    fetchNodes();
    fetchCategories();
  }, [fetchNodes, fetchCategories]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchNodes(localSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchNodes]);

  const handleRetry = () => {
    clearError();
    fetchNodes();
    fetchCategories();
  };

  // Convert backend node metadata to draggable node format
  const convertToNodeType = (nodeMetadata: any) => ({
    id: nodeMetadata.name,
    type: nodeMetadata.name,
    name: nodeMetadata.name,
    category: nodeMetadata.category,
    data: {
      name: nodeMetadata.name,
      displayName: nodeMetadata.display_name,
      description: nodeMetadata.description,
      inputs: nodeMetadata.inputs,
      outputs: nodeMetadata.outputs,
      icon: nodeMetadata.icon,
      color: nodeMetadata.color,
    },
    info: nodeMetadata.description,
  });

  const nodesToDisplay = filteredNodes.map(convertToNodeType);

  // Group nodes by category
  const nodesByCategory = nodesToDisplay.reduce((acc, node) => {
    const category = node.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(node);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="w-84 bg-gray-50 border-r border-gray-200 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-700 mb-4">Add Nodes</h3>

        {/* Search Input */}
        <label className="input w-full rounded-2xl border flex items-center gap-2 px-2 py-1 mb-3">
          <Search className="h-4 w-4 opacity-50" />
          <input
            type="search"
            className="grow"
            placeholder="Search nodes..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
          />
        </label>

        {/* Category Filter */}
        <select
          className="w-full text-sm border rounded-lg px-2 py-1"
          value={selectedCategory || ""}
          onChange={(e) => filterByCategory(e.target.value || null)}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.name} value={category.name}>
              {category.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="p-3">
        {error ? (
          <ErrorNodes error={error} onRetry={handleRetry} />
        ) : isLoading && nodes.length === 0 ? (
          <LoadingNodes />
        ) : nodesToDisplay.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              {searchQuery
                ? `No nodes match "${searchQuery}"`
                : "No nodes available"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedCategory ? (
              // Show filtered nodes in current category
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {categories.find((c) => c.name === selectedCategory)
                    ?.display_name || selectedCategory}
                </h4>
                <div className="space-y-2">
                  {nodesToDisplay.map((nodeType) => (
                    <DraggableNode key={nodeType.id} nodeType={nodeType} />
                  ))}
                </div>
              </div>
            ) : (
              // Show nodes grouped by category
              Object.entries(nodesByCategory).map(
                ([categoryName, categoryNodes]) => (
                  <div
                    key={categoryName}
                    className="collapse collapse-arrow rounded-lg"
                  >
                    <input type="checkbox" defaultChecked />
                    <div className="collapse-title font-semibold text-sm ">
                      {categories.find((c) => c.name === categoryName)
                        ?.display_name || categoryName}
                      <span className="ml-2 text-xs text-gray-500">
                        ({categoryNodes.length})
                      </span>
                    </div>
                    <div className="collapse-content space-y-2">
                      {categoryNodes.map((nodeType) => (
                        <>
                          <DraggableNode
                            key={nodeType.id}
                            nodeType={nodeType}
                          />
                          <hr className="my-2 border-gray-200" />
                        </>
                      ))}
                    </div>
                  </div>
                )
              )
            )}

            {/* Results summary */}
            {(searchQuery || selectedCategory) && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                Showing {nodesToDisplay.length} of {nodes.length} nodes
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
