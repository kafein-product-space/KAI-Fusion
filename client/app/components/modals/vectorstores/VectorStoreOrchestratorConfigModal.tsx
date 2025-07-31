import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface VectorStoreOrchestratorConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface VectorStoreOrchestratorConfig {
  connection_string: string;
  collection_name: string;
  pre_delete_collection: boolean;
  search_algorithm: string;
  search_k: number;
  score_threshold: number;
  batch_size: number;
  enable_hnsw_index: boolean;
}

const searchAlgorithms = [
  {
    value: "cosine",
    label: "Cosine Similarity",
    description: "Best for most text embeddings, measures angle between vectors",
  },
  {
    value: "euclidean",
    label: "Euclidean Distance",
    description: "L2 distance, good for normalized embeddings",
  },
  {
    value: "inner_product",
    label: "Inner Product",
    description: "Dot product similarity, fast but requires normalized vectors",
  },
];

const VectorStoreOrchestratorConfigModal = forwardRef<
  HTMLDialogElement,
  VectorStoreOrchestratorConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [connectionString, setConnectionString] = useState(nodeData?.connection_string || "");
  const [collectionName, setCollectionName] = useState(nodeData?.collection_name || "");
  const [preDeleteCollection, setPreDeleteCollection] = useState(nodeData?.pre_delete_collection || false);
  const [searchAlgorithm, setSearchAlgorithm] = useState(nodeData?.search_algorithm || "cosine");
  const [searchK, setSearchK] = useState(nodeData?.search_k || 6);
  const [scoreThreshold, setScoreThreshold] = useState(nodeData?.score_threshold || 0.0);
  const [batchSize, setBatchSize] = useState(nodeData?.batch_size || 100);
  const [enableHnswIndex, setEnableHnswIndex] = useState(nodeData?.enable_hnsw_index !== false);

  const handleSave = () => {
    onSave({
      connection_string: connectionString,
      collection_name: collectionName,
      pre_delete_collection: preDeleteCollection,
      search_algorithm: searchAlgorithm,
      search_k: Number(searchK),
      score_threshold: Number(scoreThreshold),
      batch_size: Number(batchSize),
      enable_hnsw_index: enableHnswIndex,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-4xl">
        <h3 className="font-bold text-lg">Configure Vector Store Orchestrator</h3>
        
        <div className="py-4 space-y-6">
          {/* Database Configuration */}
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Database Configuration</h4>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Connection String</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  placeholder="postgresql://user:pass@host:port/db"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Collection Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="my_collection (leave empty for auto-generated)"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="label cursor-pointer">
                    <span className="label-text">Pre-delete Collection</span>
                  </label>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={preDeleteCollection}
                  onChange={(e) => setPreDeleteCollection(e.target.checked)}
                />
              </div>
            </div>
          </div>

          {/* Retriever Configuration */}
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Retriever Configuration</h4>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Search Algorithm</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={searchAlgorithm}
                  onChange={(e) => setSearchAlgorithm(e.target.value)}
                >
                  {searchAlgorithms.map((algo) => (
                    <option key={algo.value} value={algo.value}>
                      {algo.label}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {searchAlgorithms.find(a => a.value === searchAlgorithm)?.description}
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Number of Documents to Retrieve (K)</span>
                </label>
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
                  <span className="font-bold">{searchK}</span>
                  <span>50</span>
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Score Threshold</span>
                </label>
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
                  <span className="font-bold">{scoreThreshold.toFixed(2)}</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Configuration */}
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Performance Configuration</h4>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Batch Size</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="range range-accent"
                />
                <div className="flex justify-between text-xs">
                  <span>10</span>
                  <span className="font-bold">{batchSize}</span>
                  <span>1000</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="label cursor-pointer">
                    <span className="label-text">Enable HNSW Index</span>
                  </label>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-accent"
                  checked={enableHnswIndex}
                  onChange={(e) => setEnableHnswIndex(e.target.checked)}
                />
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
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default VectorStoreOrchestratorConfigModal;