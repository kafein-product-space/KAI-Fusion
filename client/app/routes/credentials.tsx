// imports
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useUserCredentialStore } from "../stores/userCredential";
import type { CredentialCreateRequest } from "../types/api";
import { timeAgo } from "~/lib/dateFormatter";
import Loading from "~/components/Loading";
import AuthGuard from "~/components/AuthGuard";
import { apiClient } from "../lib/api-client";

function CredentialsLayout() {
  const {
    userCredentials,
    fetchCredentials,
    addCredential,
    updateCredential,
    removeCredential,
    isLoading,
    error,
  } = useUserCredentialStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [page, setPage] = useState(1);
  const [editingCredential, setEditingCredential] = useState<any>(null);
  const [editSecret, setEditSecret] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);

  interface CredentialFormValues {
    name: string;
    apiKey: string;
  }

  const filteredCredentials = userCredentials.filter((credential) =>
    credential.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalItems = filteredCredentials.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pagedCredentials = filteredCredentials.slice(startIdx, endIdx);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleCredentialSubmit = async (values: CredentialFormValues) => {
    const payload: CredentialCreateRequest = {
      name: values.name,
      data: { api_key: values.apiKey },
      service_type: "",
    };
    try {
      await addCredential(payload);
      (
        document.getElementById("modalCreateCredential") as HTMLDialogElement
      )?.close();
    } catch (e: any) {}
  };

  const validateCredential = (values: CredentialFormValues) => {
    const errors: Partial<CredentialFormValues> = {};
    if (!values.name) errors.name = "Credential name is required";
    else if (values.name.length < 3)
      errors.name = "Credential name must be at least 3 characters";
    if (!values.apiKey) errors.apiKey = "API Key is required";
    else if (values.apiKey.length < 10)
      errors.apiKey = "API Key seems too short";
    return errors;
  };

  const handleDelete = async (id: string) => {
    try {
      await removeCredential(id);
    } catch {}
  };

  const handleUpdate = async (id: string, data: CredentialFormValues) => {
    try {
      await updateCredential(id, data);
    } catch {}
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />

      <main className="flex-1 p-10 m-10 bg-background">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Credentials
              </h1>
              <p className="text-gray-600 text-lg">
                Manage and securely store your API keys, tokens, and third-party
                service credentials.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-xl"
                  placeholder="Search credentials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl"
                onClick={() =>
                  (
                    document.getElementById(
                      "modalCreateCredential"
                    ) as HTMLDialogElement
                  )?.showModal()
                }
              >
                <Plus className="w-5 h-5" />
                Create Credential
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loading size="sm" />
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          ) : userCredentials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <img
                src="/emptycredentials.svg"
                alt="Empty"
                className="w-32 h-32 opacity-60"
              />
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Credentials Yet
                </h3>
                <p className="text-gray-600">
                  Create your first credential to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pagedCredentials.map((credential) => (
                <div
                  key={credential.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {credential.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Created: {timeAgo(credential.created_at)}</span>
                          <span>Updated: {timeAgo(credential.updated_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        API Key
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          title="Edit credential"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          onClick={async () => {
                            setEditLoading(true);
                            setEditingCredential(credential);
                            try {
                              const res = await apiClient.get(
                                `/credentials/${credential.id}/secret`
                              );
                              setEditSecret(res.secret?.api_key || "");
                            } catch {
                              setEditSecret("");
                            }
                            setEditLoading(false);
                            (
                              document.getElementById(
                                `editModal-${credential.id}`
                              ) as HTMLDialogElement
                            )?.showModal();
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete credential"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          onClick={() =>
                            (
                              document.getElementById(
                                `deleteModal-${credential.id}`
                              ) as HTMLDialogElement
                            )?.showModal()
                          }
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Edit Modal */}
                  <dialog id={`editModal-${credential.id}`} className="modal">
                    <div className="modal-box">
                      <h3 className="font-bold text-lg mb-4">
                        Edit Credential
                      </h3>
                      {editLoading ? (
                        <div className="py-8 text-center">Loading...</div>
                      ) : (
                        <Formik
                          initialValues={{
                            name: credential.name,
                            apiKey: editSecret,
                          }}
                          enableReinitialize
                          validate={validateCredential}
                          onSubmit={async (values, { setSubmitting }) => {
                            await handleUpdate(credential.id, values);
                            setSubmitting(false);
                            setEditSecret("");
                            (
                              document.getElementById(
                                `editModal-${credential.id}`
                              ) as HTMLDialogElement
                            )?.close();
                          }}
                        >
                          {({ isSubmitting }) => (
                            <Form className="flex flex-col gap-4">
                              <Field
                                name="name"
                                type="text"
                                className="input"
                                placeholder="Credential Name"
                              />
                              <ErrorMessage
                                name="name"
                                component="p"
                                className="text-red-500 text-sm"
                              />
                              <Field
                                name="apiKey"
                                type="password"
                                className="input"
                                placeholder="API Key"
                              />
                              <ErrorMessage
                                name="apiKey"
                                component="p"
                                className="text-red-500 text-sm"
                              />
                              <div className="modal-action">
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() =>
                                    (
                                      document.getElementById(
                                        `editModal-${credential.id}`
                                      ) as HTMLDialogElement
                                    )?.close()
                                  }
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
                      )}
                    </div>
                  </dialog>

                  {/* Delete Modal */}
                  <dialog id={`deleteModal-${credential.id}`} className="modal">
                    <div className="modal-box">
                      <h3 className="text-lg font-bold">Delete Credential</h3>
                      <p className="py-4">
                        Are you sure you want to delete{" "}
                        <strong>{credential.name}</strong>?
                      </p>
                      <div className="modal-action">
                        <button
                          className="btn"
                          onClick={() =>
                            (
                              document.getElementById(
                                `deleteModal-${credential.id}`
                              ) as HTMLDialogElement
                            )?.close()
                          }
                        >
                          Cancel
                        </button>
                        <button
                          className="btn bg-red-500 text-white"
                          onClick={() => handleDelete(credential.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </dialog>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && !error && userCredentials.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white  rounded-2xl ">
              {/* Items per page */}
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
              <div className="text-sm text-gray-600 text-right">
                Items {totalItems === 0 ? 0 : startIdx + 1} to {endIdx} of{" "}
                {totalItems}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <dialog id="modalCreateCredential" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Add New Credential</h3>
          <Formik
            initialValues={{ name: "", apiKey: "" }}
            validate={validateCredential}
            onSubmit={handleCredentialSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="flex flex-col gap-4">
                <Field
                  name="name"
                  type="text"
                  className="input"
                  placeholder="Credential Name"
                />
                <ErrorMessage
                  name="name"
                  component="p"
                  className="text-red-500 text-sm"
                />
                <Field
                  name="apiKey"
                  type="password"
                  className="input"
                  placeholder="API Key"
                />
                <ErrorMessage
                  name="apiKey"
                  component="p"
                  className="text-red-500 text-sm"
                />
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      (
                        document.getElementById(
                          "modalCreateCredential"
                        ) as HTMLDialogElement
                      )?.close()
                    }
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
    </div>
  );
}

export default function ProtectedCredentialsLayout() {
  return (
    <AuthGuard>
      <CredentialsLayout />
    </AuthGuard>
  );
}
