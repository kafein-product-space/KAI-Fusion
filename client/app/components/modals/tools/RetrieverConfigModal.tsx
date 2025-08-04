import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Database,
  Search,
  Settings,
  Target,
  Filter,
  Zap,
  CheckCircle,
  AlertCircle,
  Lock,
  Globe,
  BarChart3,
  Sparkles,
} from "lucide-react";

interface RetrieverConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface RetrieverConfig {
  database_connection: string;
  collection_name: string;
  search_k: number;
  search_type: string;
  score_threshold: number;
}

const searchTypes = [
  {
    value: "similarity",
    label: "Similarity Search",
    description: "Standard vector similarity search",
    icon: Target,
    color: "text-blue-400",
  },
  {
    value: "mmr",
    label: "MMR (Maximal Marginal Relevance)",
    description: "Balances relevance and diversity",
    icon: Filter,
    color: "text-purple-400",
  },
];

// Retriever Features
const RETRIEVER_FEATURES = [
  {
    name: "Vector Search",
    description: "Advanced similarity-based document retrieval",
    icon: Search,
    color: "text-blue-400",
  },
  {
    name: "Database Integration",
    description: "Direct connection to PostgreSQL vector stores",
    icon: Database,
    color: "text-green-400",
  },
  {
    name: "Smart Filtering",
    description: "Configurable score thresholds and search parameters",
    icon: Filter,
    color: "text-purple-400",
  },
  {
    name: "Agent Ready",
    description: "Compatible with ReactAgent and other AI agents",
    icon: Sparkles,
    color: "text-yellow-400",
  },
];

const RetrieverConfigModal = forwardRef<
  HTMLDialogElement,
  RetrieverConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [databaseConnection, setDatabaseConnection] = useState(
    nodeData?.database_connection || ""
  );
  const [collectionName, setCollectionName] = useState(
    nodeData?.collection_name || ""
  );
  const [searchK, setSearchK] = useState(nodeData?.search_k || 6);
  const [searchType, setSearchType] = useState(
    nodeData?.search_type || "similarity"
  );
  const [scoreThreshold, setScoreThreshold] = useState(
    nodeData?.score_threshold || 0.0
  );

  const handleSave = () => {
    onSave({
      database_connection: databaseConnection,
      collection_name: collectionName,
      search_k: Number(searchK),
      search_type: searchType,
      score_threshold: Number(scoreThreshold),
    });
    dialogRef.current?.close();
  };

  const selectedSearchType = searchTypes.find((t) => t.value === searchType);

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl">Configure Retriever Provider</h3>
            <p className="text-sm text-gray-500">
              Set up document retrieval for your agents
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {RETRIEVER_FEATURES.map((feature, index) => (
            <div
              key={index}
              className="bg-base-200 p-4 rounded-lg border border-base-300"
            >
              <div className="flex items-center gap-3">
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
                <div>
                  <h4 className="font-semibold text-sm">{feature.name}</h4>
                  <p className="text-xs text-gray-500">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Database Configuration */}
          <div className="bg-base-200 p-6 rounded-lg border border-base-300">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-green-400" />
              <h4 className="font-semibold text-lg">Database Configuration</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Database Connection String
                  </span>
                  <span className="label-text-alt text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    className="input input-bordered w-full pl-10"
                    value={databaseConnection}
                    onChange={(e) => setDatabaseConnection(e.target.value)}
                    placeholder="postgresql://user:pass@host:port/db"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  PostgreSQL connection string for vector database
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Collection Name
                  </span>
                  <span className="label-text-alt text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="my_collection"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Vector collection name in the database
                </div>
              </div>
            </div>
          </div>

          {/* Search Configuration */}
          <div className="bg-base-200 p-6 rounded-lg border border-base-300">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-blue-400" />
              <h4 className="font-semibold text-lg">Search Configuration</h4>
            </div>
            <div className="space-y-6">
              <div>
                <label className="label">
                  <span className="label-text font-medium">Search Type</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {searchTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        searchType === type.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-base-300 hover:border-base-400"
                      }`}
                      onClick={() => setSearchType(type.value)}
                    >
                      <div className="flex items-center gap-3">
                        <type.icon className={`w-5 h-5 ${type.color}`} />
                        <div className="flex-1">
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-500">
                            {type.description}
                          </div>
                        </div>
                        {searchType === type.value && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Number of Documents to Retrieve (K)
                  </span>
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={searchK}
                    onChange={(e) => setSearchK(Number(e.target.value))}
                    className="range range-primary"
                  />
                  <div className="flex justify-between text-xs">
                    <span>1</span>
                    <span className="font-bold text-primary">{searchK}</span>
                    <span>50</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Number of documents to retrieve from the vector store
                  </div>
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Score Threshold
                  </span>
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={scoreThreshold}
                    onChange={(e) => setScoreThreshold(Number(e.target.value))}
                    className="range range-secondary"
                  />
                  <div className="flex justify-between text-xs">
                    <span>0.0</span>
                    <span className="font-bold text-secondary">
                      {scoreThreshold.toFixed(2)}
                    </span>
                    <span>1.0</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Minimum similarity score threshold (0.0 = no filter, 1.0 =
                    exact match)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button
            className="btn btn-outline"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Save Configuration
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default RetrieverConfigModal;
