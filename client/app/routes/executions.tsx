// DashboardLayout.jsx
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Trash,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useExecutionsStore } from "~/stores/executions";
import { useWorkflows } from "~/stores/workflows";
import { timeAgo } from "~/lib/dateFormatter";
import LoadingSpinner from "~/components/common/LoadingSpinner";

function ExecutionsLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const { executions, loading, error, fetchExecutions } = useExecutionsStore();
  const { workflows, currentWorkflow, fetchWorkflows, setCurrentWorkflow } =
    useWorkflows();
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Sayfalama hesaplamaları
  const filteredExecutions = executions.filter(
    (execution) =>
      execution.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.status.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalItems = filteredExecutions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pagedExecutions = filteredExecutions.slice(startIdx, endIdx);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    if (currentWorkflow?.id) {
      fetchExecutions(currentWorkflow.id);
    } else if (workflows.length > 0) {
      fetchExecutions(workflows[0].id);
    }
  }, [currentWorkflow, workflows, fetchExecutions]);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  return (
    <div className="flex h-screen w-screen">
      <DashboardSidebar />
      <main className="flex-1 p-10 m-10 bg-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium text-start">Executions</h1>
              <p className="text-gray-600">
                View and monitor all your workflow executions with detailed logs
                and statuses.
              </p>
              <select
                className="border border-gray-500 rounded-lg px-3 py-1 text-sm w-64 h-10"
                value={currentWorkflow?.id || ""}
                onChange={(e) => {
                  const selected = workflows.find(
                    (w) => w.id === e.target.value
                  );
                  if (selected) {
                    setCurrentWorkflow(selected);
                    fetchExecutions(selected.id);
                  }
                }}
              >
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-6 justify-center">
              <div className="flex gap-2 p-3 flex-col items-start">
                <label className="input w-full rounded-2xl border flex items-center gap-2 px-2 py-1 ">
                  <Search className="h-4 w-4 opacity-50" />
                  <input
                    type="search"
                    className="grow w-62"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
          <div>
            {error && <div className="p-4 text-red-500">{error}</div>}
            {loading ? (
              <div className="flex items-center justify-center ">
                <LoadingSpinner text="Loading Executions" />
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="flex items-center justify-center">
                  <img
                    src="/emptyexec.svg"
                    alt="emptyexec"
                    className="w-36 h-36"
                  />
                </div>
                <div className="text-lg font-light">No Executions Yet</div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-300">
                <table className="table w-full text-sm p-2">
                  <thead className="bg-[#F5F5F5] text-left text-md border-b border-gray-300 ">
                    <tr>
                      <th className="p-6 font-normal text-base">ID</th>
                      <th className="p-6 font-normal text-base">Status</th>
                      <th className="p-6 font-normal text-base">Started</th>
                      <th className="p-6 font-normal text-base">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedExecutions.map((execution) => (
                      <tr
                        key={execution.id}
                        className="border-b border-gray-300"
                      >
                        <td className="p-6">{execution.id}</td>
                        <td className="p-6">
                          {execution.status === "completed" ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(
                                execution.status
                              )}`}
                            >
                              Completed
                            </span>
                          ) : execution.status === "failed" ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(
                                execution.status
                              )}`}
                            >
                              Failed
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(
                                execution.status
                              )}`}
                            >
                              {execution.status}
                            </span>
                          )}
                        </td>
                        <td className="p-6">
                          {execution.started_at
                            ? timeAgo(execution.started_at)
                            : "-"}
                        </td>
                        <td className="p-6">
                          {execution.completed_at
                            ? timeAgo(execution.completed_at)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Modern Pagination Bar - table altı */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6 px-4 pb-4">
                  {/* Items per page */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Items per page:
                    </span>
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[10, 20, 50, 100].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Sayfa numaraları */}
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
                  {/* Items X to Y of Z */}
                  <div className="text-xs text-gray-500 text-right">
                    Items {totalItems === 0 ? 0 : startIdx + 1} to {endIdx} of{" "}
                    {totalItems}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProtectedExecutionsLayout() {
  return <ExecutionsLayout />;
}
