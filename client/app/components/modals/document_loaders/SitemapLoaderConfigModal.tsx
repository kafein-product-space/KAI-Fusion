import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface SitemapLoaderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const SitemapLoaderConfigModal = forwardRef<
  HTMLDialogElement,
  SitemapLoaderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [sitemapUrl, setSitemapUrl] = useState(nodeData?.sitemap_url || "");
  const [filterUrls, setFilterUrls] = useState(nodeData?.filter_urls || "");
  const [limit, setLimit] = useState(nodeData?.limit ?? 10);

  const handleSave = () => {
    onSave({
      sitemap_url: sitemapUrl,
      filter_urls: filterUrls,
      limit: parseInt(limit as any, 10),
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Sitemap Loader {nodeId}</h3>

        <div className="space-y-4 mt-4">
          {/* Sitemap URL */}
          <div>
            <label className="label">Sitemap URL</label>
            <input
              type="url"
              className="input input-bordered w-full"
              placeholder="https://example.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              required
            />
          </div>

          {/* Filter URLs */}
          <div>
            <label className="label">Filter Regex (Optional)</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g., ^https://example.com/blog"
              value={filterUrls}
              onChange={(e) => setFilterUrls(e.target.value)}
            />
          </div>

          {/* Limit */}
          <div>
            <label className="label">Max Pages to Load</label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={limit}
              min={1}
              onChange={(e) => setLimit(e.target.value)}
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

export default SitemapLoaderConfigModal;
