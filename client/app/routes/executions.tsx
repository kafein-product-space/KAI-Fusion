// DashboardLayout.jsx
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Trash,
  X,
  Clock,
  Play,
  FileText,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useExecutionsStore } from "~/stores/executions";
import { useWorkflows } from "~/stores/workflows";
import { timeAgo } from "~/lib/dateFormatter";
import Loading from "~/components/Loading";
import AuthGuard from "~/components/AuthGuard";

function ExecutionsLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const { executions, loading, error, fetchExecutions } = useExecutionsStore();
  const { workflows, currentWorkflow, fetchWorkflows, setCurrentWorkflow } =
    useWorkflows();
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [page, setPage] = useState(1);

  // Sayfalama hesaplamaları
  const filteredExecutions = executions.filter(
    (execution) =>
      (execution.input_text?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      execution.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (currentWorkflow?.name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      )
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

  // Set currentWorkflow to first workflow after workflows are fetched, if not set
  useEffect(() => {
    if (workflows.length > 0 && !currentWorkflow) {
      setCurrentWorkflow(workflows[0]);
    }
  }, [workflows, currentWorkflow, setCurrentWorkflow]);

  // Only fetch executions when currentWorkflow changes
  useEffect(() => {
    if (currentWorkflow?.id) {
      fetchExecutions(currentWorkflow.id);
    }
  }, [currentWorkflow, fetchExecutions]);

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

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Helper function to get execution duration
  const getExecutionDuration = (startedAt: string, completedAt?: string) => {
    if (!startedAt) return "-";
    if (!completedAt) return "Running...";

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const duration = end.getTime() - start.getTime();

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Executions
                  </h1>
                  <p className="text-gray-600 text-lg">
                    View and monitor all your workflow executions with detailed
                    logs and statuses.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                  {/* Workflow Selector */}
                  <div className="relative">
                    <select
                      className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-64"
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

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="search"
                      className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Search executions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Executions Content */}
            {error && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loading size="sm" />
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-6 py-12">
                <div className="flex items-center justify-center">
                  <img
                    src="/emptyexec.svg"
                    alt="No executions"
                    className="w-32 h-32 opacity-60"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Executions Yet
                  </h3>
                  <p className="text-gray-600">
                    Start a workflow to see execution history here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedExecutions.map((execution) => (
                  <div
                    key={execution.id}
                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200 group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Play className="w-4 h-4 text-purple-600" />
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {currentWorkflow?.name || "Unknown Workflow"}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {execution.input_text
                            ? truncateText(execution.input_text)
                            : "No input provided"}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
                          execution.status === "completed"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : execution.status === "failed"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
                        }`}
                      >
                        {execution.status === "completed" ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : execution.status === "failed" ? (
                          <X className="w-3 h-3 mr-1" />
                        ) : null}
                        {execution.status.charAt(0).toUpperCase() +
                          execution.status.slice(1)}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-2" />
                        <span className="font-medium">Started:</span>
                        <span className="ml-2">
                          {execution.started_at
                            ? timeAgo(execution.started_at)
                            : "-"}
                        </span>
                      </div>

                      {execution.completed_at && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Check className="w-3 h-3 mr-2" />
                          <span className="font-medium">Completed:</span>
                          <span className="ml-2">
                            {timeAgo(execution.completed_at)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center text-xs text-gray-500">
                        <FileText className="w-3 h-3 mr-2" />
                        <span className="font-medium">Duration:</span>
                        <span className="ml-2">
                          {getExecutionDuration(
                            execution.started_at,
                            execution.completed_at
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        #{execution.id.slice(0, 8)}...
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="View details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination - Sayfanın altında */}
        {!error && !loading && executions.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white  rounded-2xl ">
              <div></div>
              {/* Sayfa numaraları */}
              <div className="flex items-center gap-2 justify-center">
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                        p === page
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Items X to Y of Z */}
              <div className="text-sm text-gray-500">
                {startIdx + 1}-{endIdx} of {totalItems} executions
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProtectedExecutionsLayout() {
  return (
    <AuthGuard>
      <ExecutionsLayout />
    </AuthGuard>
  );
}
