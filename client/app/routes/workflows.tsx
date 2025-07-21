import {
  Copy,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Share,
  Trash,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import React, { useState, useEffect } from "react";

import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useWorkflows } from "~/stores/workflows";
import { AuthGuard } from "~/components/AuthGuard";
import type {
  Workflow,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
} from "~/types/api";
import { timeAgo } from "~/lib/dateFormatter";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Link } from "react-router";
import { useSnackbar } from "notistack";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    <span className="ml-2 text-gray-600">Loading workflows...</span>
  </div>
);

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

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (workflow: Workflow) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`
      )
    )
      return;

    setIsDeleting(workflow.id);
    try {
      await deleteWorkflow(workflow.id);
    } catch (error) {
      enqueueSnackbar("Failed to delete workflow", { variant: "error" });
    } finally {
      setIsDeleting(null);
    }
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
    <div className="flex h-screen w-screen">
      <DashboardSidebar />

      <main className="flex-1 p-10 m-10 bg-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium text-start">Workflows</h1>
              <p className="text-gray-600">
                Create, edit, and manage your automated workflows visually and
                intuitively.
              </p>
            </div>

            <div className="flex items-center gap-6 justify-center">
              <div className="flex gap-2 p-3 flex-col items-start">
                <label className="input w-full rounded-2xl border flex items-center gap-2 px-2 py-1">
                  <Search className="h-4 w-4 opacity-50" />
                  <input
                    type="search"
                    className="grow w-62"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F5F5] transition duration-500 h-10 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button className="flex items-center gap-2 px-4 py-2 bg-[#9664E0] text-white rounded-lg hover:bg-[#8557d4] transition duration-200">
                  <Link
                    to="/canvas"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create Workflow
                  </Link>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {error ? (
            <ErrorMessageBlock error={error} onRetry={handleRetry} />
          ) : isLoading && workflows.length === 0 ? (
            <LoadingSpinner />
          ) : workflows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="relative rounded-xl border border-gray-300">
              <table className="table w-full text-sm p-2">
                <thead className="bg-[#F5F5F5] text-left text-md border-b border-gray-300">
                  <tr>
                    <th className="p-6 font-normal text-base">Name</th>
                    <th className="p-6 font-normal text-base">Description</th>
                    <th className="p-6 font-normal text-base">Status</th>
                    <th className="p-6 font-normal text-base">Created</th>
                    <th className="p-6 font-normal text-base">Updated</th>
                    <th className="p-6 font-normal text-base"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkflows.map((workflow) => (
                    <tr key={workflow.id}>
                      <td className="p-6 text-blue-600">
                        <Link to={`/canvas?workflow=${workflow.id}`}>
                          {workflow.name}
                        </Link>
                      </td>
                      <td className="p-6">{workflow.description}</td>
                      <td className="p-6">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            workflow.is_public
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {workflow.is_public ? "Public" : "Private"}
                        </span>
                      </td>
                      <td className="p-6">{timeAgo(workflow.created_at)}</td>
                      <td className="p-6">{timeAgo(workflow.updated_at)}</td>
                      <td className="p-6">
                        <div className="relative dropdown flex justify-center items-center">
                          <div
                            tabIndex={0}
                            role="button"
                            className={`btn btn-ghost btn-sm p-2 ${
                              isDeleting === workflow.id
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {isDeleting === workflow.id ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                            ) : (
                              <MoreVertical className="w-4 h-4" />
                            )}
                          </div>
                          <ul
                            tabIndex={0}
                            className="dropdown-content z-[1000] menu p-2 shadow bg-base-100 border border-gray-200 rounded-box w-40 absolute right-0 top-full mt-1"
                          >
                            <li>
                              <button
                                onClick={() => {
                                  setEditWorkflow(workflow);
                                  (
                                    document.getElementById(
                                      "modalEditWorkflow"
                                    ) as HTMLDialogElement
                                  )?.showModal();
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(workflow.id)
                                }
                              >
                                <Copy className="w-4 h-4" />
                                Copy ID
                              </button>
                            </li>
                            <li>
                              <button>
                                <Share className="w-4 h-4" />
                                Share
                              </button>
                            </li>
                            <li>
                              <button
                                className={`text-red-600 hover:bg-red-50 ${
                                  isDeleting === workflow.id
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={() =>
                                  isDeleting === workflow.id
                                    ? null
                                    : handleDelete(workflow)
                                }
                              >
                                <Trash className="w-4 h-4" />
                                Delete
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {searchQuery && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-300 text-sm text-gray-600">
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
        </div>

        {/* Modal */}
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
