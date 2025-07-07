import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface RecursiveTextSplitterConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const RecursiveTextSplitterConfigModal = forwardRef<
  HTMLDialogElement,
  RecursiveTextSplitterConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [chunkSize, setChunkSize] = useState(nodeData?.chunk_size || 1000);
  const [chunkOverlap, setChunkOverlap] = useState(
    nodeData?.chunk_overlap || 200
  );
  const [separators, setSeparators] = useState(
    nodeData?.separators?.join(",") || "\\n\\n,\\n, ,"
  );

  const handleSave = () => {
    const parsedSeparators = separators
      .split(",")
      .map((s: string) => s.replace(/\\n/g, "\n").trim());

    onSave({
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
      separators: parsedSeparators,
    });

    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Recursive Text Splitter {nodeId}</h3>

        <label className="label mt-2">
          <span className="label-text">Chunk Size</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={chunkSize}
          onChange={(e) => setChunkSize(Number(e.target.value))}
        />

        <label className="label mt-2">
          <span className="label-text">Chunk Overlap</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={chunkOverlap}
          onChange={(e) => setChunkOverlap(Number(e.target.value))}
        />

        <label className="label mt-2">
          <span className="label-text">
            Separators (comma-separated, e.g. \n\n, \n, space)
          </span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={separators}
          onChange={(e) => setSeparators(e.target.value)}
        />

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

export default RecursiveTextSplitterConfigModal;
