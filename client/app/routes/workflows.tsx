import {
  Pencil,
  Plus,
  Search,
  Trash,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import React, { useState, useEffect } from "react";

import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useWorkflows } from "~/stores/workflows";
import { usePinnedItems } from "~/stores/pinnedItems";

import type {
  Workflow,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
} from "~/types/api";
import { timeAgo } from "~/lib/dateFormatter";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Link } from "react-router";
import { useSnackbar } from "notistack";
import AuthGuard from "~/components/AuthGuard";
import Loading from "~/components/Loading";
import PinnedItemsSection from "~/components/common/PinnedItemsSection";
import PinButton from "~/components/common/PinButton";

const ErrorMessageBlock = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Error loading workflows
      </h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </button>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-12">
    <div className="mx-auto h-12 w-12 text-gray-400">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    </div>
    <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows</h3>
    <p className="mt-1 text-sm text-gray-500">
      Get started by creating a new workflow.
    </p>
    <div className="mt-6">
      <Link
        to="/canvas"
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Workflow
      </Link>
    </div>
  </div>
);

function WorkflowsLayout() {
  const { enqueueSnackbar } = useSnackbar();
  interface WorkflowFormValues {
    name: string;
    description: string;
    is_public: boolean;
  }

  const {
    workflows,
    isLoading,
    error,
    fetchWorkflows,
    deleteWorkflow,
    clearError,
    updateWorkflow,
  } = useWorkflows();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editWorkflow, setEditWorkflow] = useState<Workflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [page, setPage] = useState(1);

  // Sayfalama hesaplamaları
  const totalItems = workflows.length; // Use workflows from the store for total count
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pagedWorkflows = workflows.slice(startIdx, endIdx); // Use workflows from the store for paged data

  useEffect(() => {
    // Sayfa değişince, eğer mevcut sayfa yeni toplam sayfa sayısından büyükse, son sayfaya çek
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (workflow: Workflow) => {
    setWorkflowToDelete(workflow);
    setShowDeleteConfirm(true);
  };

  const handleFinalDeleteConfirm = async () => {
    if (!workflowToDelete) return;

    setIsDeleting(workflowToDelete.id);
    try {
      await deleteWorkflow(workflowToDelete.id);
      enqueueSnackbar("Workflow deleted successfully", { variant: "success" });
    } catch (error: any) {
      console.error("Delete workflow error:", error);

      // API'den gelen error mesajını al
      const errorMessage =
        error?.message || error?.detail || "Failed to delete workflow";

      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsDeleting(null);
      setWorkflowToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setWorkflowToDelete(null);
  };

  const handleRetry = () => {
    clearError();
    fetchWorkflows();
  };

  const validateWorkflow = (values: WorkflowFormValues) => {
    const errors: Partial<WorkflowFormValues> = {};

    if (!values.name) errors.name = "Workflow name is required";
    else if (values.name.length < 3)
      errors.name = "Workflow name must be at least 3 characters";

    if (!values.description)
      errors.description = "Workflow description is required";
    else if (values.description.length < 3)
      errors.description = "Workflow description seems too short";

    return errors;
  };

  // Edit modal submit fonksiyonu
  const handleWorkflowEditSubmit = async (
    values: WorkflowFormValues,
    { setSubmitting }: any
  ) => {
    if (!editWorkflow) return;
    const payload: WorkflowUpdateRequest = {
      name: values.name,
      description: values.description,
      is_public: values.is_public,
      flow_data: editWorkflow.flow_data, // flow_data'yı koru
    };
    try {
      await updateWorkflow(editWorkflow.id, payload);
      enqueueSnackbar("Workflow updated successfully", { variant: "success" });
      (
        document.getElementById("modalEditWorkflow") as HTMLDialogElement
      )?.close();
      setEditWorkflow(null);
    } catch (e) {
      enqueueSnackbar("Failed to update workflow", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />

      <main className="flex-1 p-10 m-10 bg-background">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Workflows
                </h1>
                <p className="text-gray-600 text-lg">
                  Create, edit, and manage your automated workflows visually and
                  intuitively.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="search"
                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Refresh Button */}

                {/* Create Workflow Button */}
                <Link
                  to="/canvas"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Create Workflow
                </Link>
              </div>
            </div>
          </div>

          {/* Pinned Workflows Section */}
          <PinnedItemsSection type="workflow" />

          {/* Workflows Grid */}
          {error ? (
            <ErrorMessageBlock error={error} onRetry={handleRetry} />
          ) : isLoading && workflows.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loading size="sm" />
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200 group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link
                        to={`/canvas?workflow=${workflow.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors group-hover:text-purple-600"
                      >
                        {workflow.name}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {workflow.description || "No description"}
                      </p>
                    </div>

                    {/* Status Badge and Pin Button */}
                    <div className="flex items-center gap-2">
                      <PinButton
                        id={workflow.id}
                        type="workflow"
                        title={workflow.name}
                        description={workflow.description}
                        metadata={{
                          status: workflow.is_public ? "Public" : "Private",
                          lastActivity: workflow.updated_at,
                        }}
                        size="sm"
                        variant="minimal"
                      />
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          workflow.is_public
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {workflow.is_public ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="font-medium">Created:</span>
                      <span className="ml-2">
                        {timeAgo(workflow.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="font-medium">Updated:</span>
                      <span className="ml-2">
                        {timeAgo(workflow.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Link
                      to={`/canvas?workflow=${workflow.id}`}
                      className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Open Workflow
                      <ChevronRight className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditWorkflow(workflow);
                          (
                            document.getElementById(
                              "modalEditWorkflow"
                            ) as HTMLDialogElement
                          )?.showModal();
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Edit workflow"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workflow)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Delete workflow"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination - Sayfanın altında */}
        {!error && !isLoading && workflows.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white  rounded-2xl ">
              {/* Sayfa numaraları */}
              <div></div>
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
              <div className="text-sm text-gray-600 text-right">
                Items {totalItems === 0 ? 0 : startIdx + 1} to {endIdx} of{" "}
                {totalItems}
              </div>
            </div>

            {/* Search Results Info */}
            {searchQuery && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                Showing {filteredWorkflows.length} of {workflows.length}{" "}
                workflows
                {filteredWorkflows.length === 0 && (
                  <span className="ml-2 text-gray-500">
                    - No workflows match "{searchQuery}"
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        <dialog id="modalEditWorkflow" className="modal">
          <div className="modal-box">
            <Formik
              enableReinitialize
              initialValues={{
                name: editWorkflow?.name || "",
                description: editWorkflow?.description || "",
                is_public: editWorkflow?.is_public || false,
              }}
              validate={validateWorkflow}
              onSubmit={handleWorkflowEditSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="flex flex-col gap-4 space-y-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="font-light">
                      Workflow Name
                    </label>
                    <Field
                      name="name"
                      type="text"
                      placeholder="Enter workflow name"
                      className="input w-full h-12 rounded-2xl border-gray-300 bg-white hover:border-gray-400"
                    />
                    <ErrorMessage
                      name="name"
                      component="p"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="description" className="font-light">
                      Description
                    </label>
                    <Field
                      name="description"
                      type="text"
                      placeholder="Enter description"
                      className="input w-full h-12 rounded-2xl border-gray-300 bg-white hover:border-gray-400"
                    />
                    <ErrorMessage
                      name="description"
                      component="p"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="is_public" className="font-light">
                      Is Public
                    </label>
                    <Field
                      name="is_public"
                      type="checkbox"
                      className="checkbox"
                    />
                  </div>

                  <div className="modal-action">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        (
                          document.getElementById(
                            "modalEditWorkflow"
                          ) as HTMLDialogElement
                        )?.close();
                        setEditWorkflow(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : "Save"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </dialog>
      </main>

      {/* İlk Delete Confirm Modal */}
      <dialog
        open={showDeleteConfirm}
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete Workflow</h3>
          <p className="py-4">
            Are you sure you want to delete "{workflowToDelete?.name}"?
          </p>
          <div className="modal-action">
            <button className="btn btn-outline" onClick={handleCancelDelete}>
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleFinalDeleteConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default function ProtectedWorkflowsLayout() {
  return (
    <AuthGuard>
      <WorkflowsLayout />
    </AuthGuard>
  );
}
