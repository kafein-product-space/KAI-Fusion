import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

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
    description: "Standard vector similarity search"
  },
  {
    value: "mmr",
    label: "MMR (Maximal Marginal Relevance)",
    description: "Balances relevance and diversity"
  }
];

const RetrieverConfigModal = forwardRef<
  HTMLDialogElement,
  RetrieverConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [databaseConnection, setDatabaseConnection] = useState(nodeData?.database_connection || "");
  const [collectionName, setCollectionName] = useState(nodeData?.collection_name || "");
  const [searchK, setSearchK] = useState(nodeData?.search_k || 6);
  const [searchType, setSearchType] = useState(nodeData?.search_type || "similarity");
  const [scoreThreshold, setScoreThreshold] = useState(nodeData?.score_threshold || 0.0);

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

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-4xl">
        <h3 className="font-bold text-lg">Configure Retriever Provider</h3>
        
        <div className="py-4 space-y-6">
          {/* Database Configuration */}
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Database Configuration</h4>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Database Connection String</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={databaseConnection}
                  onChange={(e) => setDatabaseConnection(e.target.value)}
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
                  placeholder="my_collection"
                />
              </div>
            </div>
          </div>

          {/* Search Configuration */}
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Search Configuration</h4>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Search Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  {searchTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {searchTypes.find(t => t.value === searchType)?.description}
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

export default RetrieverConfigModal;