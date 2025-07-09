import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface GitHubLoaderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const GitHubLoaderConfigModal = forwardRef<
  HTMLDialogElement,
  GitHubLoaderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [repoUrl, setRepoUrl] = useState(nodeData?.repo_url || "");
  const [branch, setBranch] = useState(nodeData?.branch || "main");
  const [fileFilter, setFileFilter] = useState(nodeData?.file_filter || "");
  const [maxFiles, setMaxFiles] = useState(nodeData?.max_files || 50);

  const handleSave = () => {
    onSave({
      repo_url: repoUrl,
      branch,
      file_filter: fileFilter,
      max_files: parseInt(maxFiles as any, 10),
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure GitHub Loader {nodeId}</h3>

        <div className="space-y-4 mt-4">
          {/* Repository URL */}
          <div>
            <label className="label">Repository URL</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />
          </div>

          {/* Branch */}
          <div>
            <label className="label">Branch</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>

          {/* File Filter */}
          <div>
            <label className="label">File Filter</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder=".py,.md,.txt"
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
            />
          </div>

          {/* Max Files */}
          <div>
            <label className="label">Max Files</label>
            <input
              type="number"
              className="input input-bordered w-full"
              min={1}
              max={500}
              value={maxFiles}
              onChange={(e) => setMaxFiles(parseInt(e.target.value, 10))}
            />
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

export default GitHubLoaderConfigModal;
