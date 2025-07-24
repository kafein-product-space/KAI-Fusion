import React, { useEffect, useState } from "react";
import {
  Copy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useWorkflows } from "~/stores/workflows";
import { timeAgo } from "~/lib/dateFormatter";
import AuthGuard from "~/components/AuthGuard";
import Loading from "~/components/Loading";

function MarketplaceLayout() {
  const {
    publicWorkflows,
    fetchPublicWorkflows,
    duplicateWorkflow,
    isLoading,
    error,
  } = useWorkflows();

  const [searchQuery, setSearchQuery] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [page, setPage] = useState(1);

  const filteredWorkflows = publicWorkflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = filteredWorkflows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pagedWorkflows = filteredWorkflows.slice(startIdx, endIdx);

  useEffect(() => {
    fetchPublicWorkflows();
  }, [fetchPublicWorkflows]);

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    try {
      await duplicateWorkflow(id);
      alert("Workflow copied to your account!");
    } catch (e) {
      alert("Failed to copy workflow");
    } finally {
      setDuplicating(null);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 p-10 m-10 bg-background">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium text-start">Marketplace</h1>
              <p className="text-gray-600">
                Discover and copy public workflows shared by the community.
              </p>
            </div>
            <div className="flex items-center gap-6 justify-center">
              <div className="flex gap-2 p-3 flex-col items-start">
                <label className="input w-full rounded-2xl border flex items-center gap-2 px-2 py-1">
                  <input
                    type="search"
                    className="grow w-62"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>
              <button
                onClick={fetchPublicWorkflows}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F5F5] transition duration-500 h-10"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loading size="sm" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-12">{error}</div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No public workflows
              </h3>
              <p className="text-gray-600">Try again later.</p>
            </div>
          ) : (
            <div className="relative rounded-xl border border-gray-300">
              <table className="table w-full text-sm p-2">
                <thead className="bg-background text-foreground text-left text-md border-b border-gray-300">
                  <tr>
                    <th className="p-6 font-normal text-base">Name</th>
                    <th className="p-6 font-normal text-base">Description</th>
                    <th className="p-6 font-normal text-base">Owner</th>
                    <th className="p-6 font-normal text-base">Created</th>
                    <th className="p-6 font-normal text-base">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedWorkflows.map((wf) => (
                    <tr key={wf.id}>
                      <td className="p-6 text-blue-600">{wf.name}</td>
                      <td className="p-6">{wf.description}</td>
                      <td className="p-6">{wf.user_id?.slice(0, 8) || "-"}</td>
                      <td className="p-6">{timeAgo(wf.created_at)}</td>
                      <td className="p-6">
                        <button
                          className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          onClick={() => handleDuplicate(wf.id)}
                          disabled={duplicating === wf.id}
                        >
                          <Copy className="w-4 h-4" />
                          {duplicating === wf.id ? "Copying..." : "Copy"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Items per page:</span>
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {[7, 10, 20, 50, 100].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 justify-center">
                  <button
                    className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1 rounded text-xs border transition ${
                          p === page
                            ? "bg-[#9664E0] text-white border-[#9664E0] font-bold"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  Items {totalItems === 0 ? 0 : startIdx + 1} to {endIdx} of{" "}
                  {totalItems}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProtectedMarketplaceLayout() {
  return (
    <AuthGuard>
      <MarketplaceLayout />
    </AuthGuard>
  );
}
