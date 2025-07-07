import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface TokenTextSplitterConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const TokenTextSplitterConfigModal = forwardRef<
  HTMLDialogElement,
  TokenTextSplitterConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [chunkSize, setChunkSize] = useState(nodeData?.chunk_size || 500);
  const [chunkOverlap, setChunkOverlap] = useState(
    nodeData?.chunk_overlap || 50
  );
  const [encodingName, setEncodingName] = useState(
    nodeData?.encoding_name || "cl100k_base"
  );

  const handleSave = () => {
    onSave({
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
      encoding_name: encodingName,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Token Text Splitter {nodeId}</h3>

        <label className="label mt-2">
          <span className="label-text">Chunk Size (max tokens per chunk)</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={chunkSize}
          onChange={(e) => setChunkSize(Number(e.target.value))}
        />

        <label className="label mt-2">
          <span className="label-text">Chunk Overlap (token overlap)</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={chunkOverlap}
          onChange={(e) => setChunkOverlap(Number(e.target.value))}
        />

        <label className="label mt-2">
          <span className="label-text">Encoding Name</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={encodingName}
          onChange={(e) => setEncodingName(e.target.value)}
        >
          <option value="cl100k_base">cl100k_base</option>
          <option value="p50k_base">p50k_base</option>
          <option value="r50k_base">r50k_base</option>
          <option value="gpt2">gpt2</option>
        </select>

        <div className="modal-action">
          <button className="btn" onClick={() => dialogRef.current?.close()}>
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

export default TokenTextSplitterConfigModal;
