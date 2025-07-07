import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface CharacterTextSplitterConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const CharacterTextSplitterConfigModal = forwardRef<
  HTMLDialogElement,
  CharacterTextSplitterConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [text, setText] = useState(nodeData?.text || "");
  const [chunkSize, setChunkSize] = useState(nodeData?.chunk_size || 1000);
  const [chunkOverlap, setChunkOverlap] = useState(
    nodeData?.chunk_overlap || 200
  );
  const [separator, setSeparator] = useState(nodeData?.separator || "\n\n");

  const handleSave = () => {
    onSave({
      text,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
      separator,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Character Text Splitter {nodeId}</h3>

        <label className="label">
          <span className="label-text">Text (optional if input connected)</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={4}
          placeholder="You can leave this empty if text comes from previous node"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

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
          <span className="label-text">Separator</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={separator}
          onChange={(e) => setSeparator(e.target.value)}
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

export default CharacterTextSplitterConfigModal;
