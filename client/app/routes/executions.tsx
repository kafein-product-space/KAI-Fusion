// DashboardLayout.jsx
import { Check, MoreVertical, Search, Trash, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { AuthGuard } from "../components/AuthGuard";
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
                <table className="w-full text-sm p-2">
                  <thead className="bg-[#F5F5F5] text-left text-md border-b border-gray-300 ">
                    <tr>
                      <th className="p-6 font-normal text-base">ID</th>
                      <th className="p-6 font-normal text-base">Status</th>
                      <th className="p-6 font-normal text-base">Started</th>
                      <th className="p-6 font-normal text-base">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions
                      .filter(
                        (execution) =>
                          execution.id
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          execution.status
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                      )
                      .map((execution) => (
                        <tr
                          key={execution.id}
                          className="border-b border-gray-300"
                        >
                          <td className="p-6">{execution.id}</td>
                          <td className="p-6">
                            {execution.status === "success" ? (
                              <span className="text-green-500 flex items-center gap-2">
                                <Check />
                                Success
                              </span>
                            ) : execution.status === "failed" ? (
                              <span className="text-red-500 flex items-center gap-2">
                                <X />
                                Failed
                              </span>
                            ) : (
                              <span className="text-gray-500 flex items-center gap-2">
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
              </div>
            )}
          </div>
        </div>
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
