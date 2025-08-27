import React, { useEffect, useState } from "react";
import { Play, Clock, Check, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import AuthGuard from "~/components/AuthGuard";
import Loading from "~/components/Loading";
import DeleteConfirmationModal from "~/components/modals/DeleteConfirmationModal";
import { useExecutionsStore } from "~/stores/executions";
import { useWorkflows } from "~/stores/workflows";
import { timeAgo } from "~/lib/dateFormatter";

interface Execution {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "completed" | "failed";
  input_text?: string;
  output_text?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

function ExecutionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    executionId: string | null;
  }>({
    isOpen: false,
    executionId: null,
  });

  const { executions, loading, error, fetchExecutions, deleteExecution } = useExecutionsStore();
  const { workflows, fetchWorkflows } = useWorkflows();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (workflows.length > 0) {
      // İlk workflow'dan executions'ları getir (demo için)
      // Gelecekte tüm executions endpoint'i eklendiğinde değiştirilecek
      fetchExecutions(workflows[0].id);
    }
  }, [workflows, fetchExecutions]);

  const totalPages = Math.ceil(executions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentExecutions = executions.slice(startIndex, startIndex + itemsPerPage);

  // Debug için executions verilerini kontrol et
  console.log('Executions data:', executions);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getWorkflowName = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    return workflow ? workflow.name : "Unknown Workflow";
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    if (!startedAt) return "-";
    if (!completedAt) return "Running...";

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const duration = end.getTime() - start.getTime();

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getInputText = (execution: any) => {
    // String değerleri kontrol et
    if (execution.input_text && typeof execution.input_text === 'string') {
      return execution.input_text;
    }
    
    // Eğer inputs objesi varsa, içindeki input değerini al
    if (execution.inputs && typeof execution.inputs === 'object') {
      if (execution.inputs.input && typeof execution.inputs.input === 'string') {
        return execution.inputs.input;
      }
    }
    
    // Eğer input objesi varsa, içindeki değeri al
    if (execution.input) {
      if (typeof execution.input === 'string') {
        return execution.input;
      } else if (typeof execution.input === 'object' && execution.input.input) {
        return execution.input.input;
      }
    }
    
    return "No input provided";
  };

  const handleDeleteClick = (executionId: string) => {
    setDeleteModal({
      isOpen: true,
      executionId,
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.executionId) {
      await deleteExecution(deleteModal.executionId);
      setDeleteModal({
        isOpen: false,
        executionId: null,
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      executionId: null,
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background text-foreground">
        <DashboardSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loading size="lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Executions</h1>
              <p className="text-gray-600">Monitor your workflow execution history</p>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">
                  {typeof error === 'string' ? error : 'An error occurred while loading executions'}
                </p>
              </div>
            )}

            {/* Empty State */}
            {executions.length === 0 && !loading ? (
              <div className="text-center py-12">
                <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No executions yet</h3>
                <p className="text-gray-500">Run a workflow to see execution history here</p>
              </div>
            ) : (
              <>
                {/* Executions Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Workflow
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Started
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Input
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentExecutions.map((execution) => (
                          <tr key={execution.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Play className="w-4 h-4 text-purple-600 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {getWorkflowName(execution.workflow_id)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    #{execution.id.slice(0, 8)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(execution.status)}`}>
                                {execution.status === "completed" && <Check className="w-3 h-3 mr-1" />}
                                {execution.status === "failed" && <X className="w-3 h-3 mr-1" />}
                                {execution.status === "running" && <Clock className="w-3 h-3 mr-1 animate-spin" />}
                                {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {execution.started_at ? timeAgo(execution.started_at) : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatDuration(execution.started_at, execution.completed_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {getInputText(execution)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteClick(execution.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete execution"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, executions.length)} of {executions.length} executions
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded text-sm ${
                              page === currentPage
                                ? "bg-purple-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={loading}
        title="Delete Execution"
        message="Are you sure you want to delete this execution? This action cannot be undone and all execution data will be permanently removed."
      />
    </div>
  );
}

export default function ProtectedExecutionsPage() {
  return (
    <AuthGuard>
      <ExecutionsPage />
    </AuthGuard>
  );
}