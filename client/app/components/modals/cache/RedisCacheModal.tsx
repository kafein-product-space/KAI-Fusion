import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface RedisCacheConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const RedisCacheConfigModal = forwardRef<
  HTMLDialogElement,
  RedisCacheConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [redisUrl, setRedisUrl] = useState(
    nodeData?.redis_url || "redis://localhost:6379"
  );
  const [ttl, setTtl] = useState<number>(nodeData?.ttl || 3600);

  const handleSave = () => {
    onSave({
      redis_url: redisUrl,
      ttl: Number(ttl),
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Redis Cache</h3>

        <div className="py-4 space-y-3">
          <div>
            <label className="label">
              <span className="label-text">Redis URL</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={redisUrl}
              onChange={(e) => setRedisUrl(e.target.value)}
              placeholder="redis://localhost:6379"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">TTL (seconds)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={ttl}
              min={0}
              onChange={(e) => setTtl(Number(e.target.value))}
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

export default RedisCacheConfigModal;
