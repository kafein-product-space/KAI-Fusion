import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface YoutubeLoaderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const YoutubeLoaderConfigModal = forwardRef<
  HTMLDialogElement,
  YoutubeLoaderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [videoUrl, setVideoUrl] = useState(nodeData?.video_url || "");
  const [language, setLanguage] = useState(nodeData?.language || "en");
  const [addVideoInfo, setAddVideoInfo] = useState(
    nodeData?.add_video_info ?? true
  );

  const handleSave = () => {
    onSave({
      video_url: videoUrl,
      language,
      add_video_info: addVideoInfo,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure YouTube Loader {nodeId}</h3>

        <div className="space-y-4 mt-4">
          {/* Video URL */}
          <div>
            <label className="label">YouTube Video URL or ID</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="https://www.youtube.com/watch?v=abc123xyz"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
            />
          </div>

          {/* Language */}
          <div>
            <label className="label">Transcript Language</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g., en or tr"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>

          {/* Add Video Info */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Include Video Metadata?</span>
              <input
                type="checkbox"
                className="checkbox"
                checked={addVideoInfo}
                onChange={() => setAddVideoInfo(!addVideoInfo)}
              />
            </label>
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

export default YoutubeLoaderConfigModal;
