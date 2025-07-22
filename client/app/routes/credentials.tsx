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
import LoadingSpinner from "~/components/common/LoadingSpinner";
import AuthGuard from "~/components/AuthGuard";

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
  interface Api {
    id: number;
    name: string;
    logo: string;
  }
  interface CredentialFormValues {
    name: string;
    apiKey: string;
  }

  const [selectedApi, setSelectedApi] = useState<Api | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Sayfalama hesaplamaları
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [apiKeys] = useState([
    {
      id: 1,
      name: "OpenAI API",
      logo: "https://www.svgrepo.com/show/306500/openai.svg",
    },
    {
      id: 2,
      name: "GitHub API",
      logo: "https://cdn-icons-png.flaticon.com/512/25/25231.png",
    },
    {
      id: 3,
      name: "Google API",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1200px-Google_%22G%22_logo.svg.png",
    },
  ]);

  const handleCredentialSubmit = async (values: CredentialFormValues) => {
    if (selectedApi) {
      const payload: CredentialCreateRequest = {
        name: values.name,
        data: { api_key: values.apiKey },
        service_type:
          selectedApi.name === "OpenAI API"
            ? "openai"
            : selectedApi.name?.toLowerCase().replace(/ api$/, ""),
      };
      try {
        await addCredential(payload);
        // Modal'ı kapat
        const modal = document.getElementById(
          "modalCreateCredential"
        ) as HTMLDialogElement;
        modal?.close();
        setSelectedApi(null);
      } catch (e) {
        // handle error
      }
    }
  };

  const validateCredential = (values: CredentialFormValues) => {
    const errors: Partial<CredentialFormValues> = {};

    if (!values.name) {
      errors.name = "Credential name is required";
    } else if (values.name.length < 3) {
      errors.name = "Credential name must be at least 3 characters";
    }

    if (!values.apiKey) {
      errors.apiKey = "API Key is required";
    } else if (values.apiKey.length < 10) {
      errors.apiKey = "API Key seems too short";
    }

    return errors;
  };

  const handleDelete = async (id: string) => {
    try {
      await removeCredential(id);
    } catch (e) {
      // handle error
    }
  };

  const handleUpdate = async (id: string, data: CredentialFormValues) => {
    try {
      await updateCredential(id, data);
    } catch (e) {
      // handle error
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10 m-10 bg-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium text-start">Credentials</h1>
              <p className="text-gray-600">
                Manage and securely store your API keys, tokens, and third-party
                service credentials.
              </p>
              <select className="border border-gray-300 rounded-lg px-3 py-1 text-sm w-64 h-10">
                <option className="text-sm">Last 7 days</option>
              </select>
            </div>

            {/* Search & Create Button */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6 justify-center">
                <div className="flex gap-2 p-3 flex-col items-start">
                  <label className="input w-full rounded-2xl border flex items-center gap-2 px-2 py-1 ">
                    <Search className="h-4 w-4 opacity-50" />
                    <input
                      type="search"
                      className="grow w-62"
                      placeholder="Search"
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#9664E0] text-white rounded-lg hover:bg-[#8557d4] transition duration-200"
                onClick={() =>
                  (
                    document.getElementById("my_modal_1") as HTMLDialogElement
                  )?.showModal()
                }
              >
                <Plus className="w-4 h-4" />
                Create Credential
              </button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center ">
              <LoadingSpinner text="Loading Credentials" />
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : userCredentials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center justify-center">
                <img
                  src="/emptycredentials.svg"
                  alt="emptycredentials"
                  className="w-36 h-36"
                />
              </div>
              <div className="text-lg font-light">No Credentials Yet</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-300">
              <table className="w-full text-sm p-2">
                <thead className="bg-[#F5F5F5] text-left text-md border-b border-gray-300 ">
                  <tr>
                    <th className="p-6 font-normal text-base">Name</th>
                    <th className="p-6 font-normal text-base">Created</th>
                    <th className="p-6 font-normal text-base">Updated</th>
                    <th></th>
                    <th className="p-6 font-medium text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCredentials.map((credential) => (
                    <tr
                      key={credential.id}
                      className="border-b border-gray-300"
                    >
                      <td className="p-6 flex items-center gap-4">
                        {/* Optionally add logo if available */}
                        {credential.name}
                      </td>
                      <td className="p-3">{timeAgo(credential.created_at)}</td>
                      <td className="p-3">{timeAgo(credential.updated_at)}</td>
                      <td></td>
                      <td className="p-6">
                        <div className="flex items-center gap-1">
                          <button
                            className="p-2 rounded-lg hover:bg-purple-50 transition duration-200 group"
                            title="Edit variable"
                            onClick={() =>
                              (
                                document.getElementById(
                                  `editModal-${credential.id}`
                                ) as HTMLDialogElement
                              )?.showModal()
                            }
                          >
                            <Pencil className="w-4 h-4 text-gray-400 group-hover:text-[#9664E0]" />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-red-50 transition duration-200 group"
                            title="Delete variable"
                            onClick={() =>
                              (
                                document.getElementById(
                                  `deleteModal-${credential.id}`
                                ) as HTMLDialogElement
                              )?.showModal()
                            }
                          >
                            <Trash className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                          </button>
                        </div>
                        <dialog
                          id={`updateModal-${credential.id}`}
                          className="modal"
                        >
                          <div className="modal-box">
                            <h3 className="font-bold text-lg">
                              Update Credential
                            </h3>
                            <p className="py-4">
                              Update{" "}
                              <strong className="font-mono">
                                {credential.name}
                              </strong>
                              ?
                              <br />
                              <span className="text-red-600 text-sm">
                                This action cannot be undone.
                              </span>
                            </p>
                            <div className="modal-action">
                              <form
                                method="dialog"
                                className="flex items-center gap-2"
                              >
                                <button className="btn">Cancel</button>
                                <button className="btn bg-red-500 hover:bg-red-600 text-white">
                                  Update
                                </button>
                              </form>
                            </div>
                          </div>
                        </dialog>

                        {/* Delete Modal for each variable */}
                        <dialog
                          id={`deleteModal-${credential.id}`}
                          className="modal"
                        >
                          <div className="modal-box">
                            <h3 className="font-bold text-lg">
                              Delete Credential
                            </h3>
                            <p className="py-4">
                              Are you sure you want to delete{" "}
                              <strong className="font-mono">
                                {credential.name}
                              </strong>
                              ?
                              <br />
                              <span className="text-red-600 text-sm">
                                This action cannot be undone.
                              </span>
                            </p>
                            <div className="modal-action">
                              <form
                                method="dialog"
                                className="flex items-center gap-2"
                              >
                                <button className="btn">Cancel</button>
                                <button
                                  className="btn bg-red-500 hover:bg-red-600 text-white"
                                  onClick={() => handleDelete(credential.id)}
                                >
                                  Delete
                                </button>
                              </form>
                            </div>
                          </div>
                        </dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Modern Pagination Bar - table altı */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6 px-4 pb-4">
                {/* Items per page */}
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
      </main>

      {/* First Modal: Select API */}
      <dialog id="my_modal_1" className="modal">
        <div className="modal-box space-y-4 max-h-[80vh] overflow-auto">
          <h3 className="font-bold text-lg">Add New Credential</h3>
          <div className="flex items-center gap-6 justify-center w-full">
            <div className="flex gap-2 p-3 flex-col items-start w-full">
              <label className="input w-full rounded-2xl border flex items-center gap-2 px-2 py-1">
                <Search className="h-4 w-4 opacity-50" />
                <input
                  type="search"
                  className="grow w-full"
                  placeholder="Search"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center justify-center gap-2 w-full border rounded-2xl p-3 hover:bg-[#ede7f6] hover:text-[#9664E0] cursor-pointer"
                onClick={() => {
                  const modal1 = document.getElementById(
                    "my_modal_1"
                  ) as HTMLDialogElement;
                  const modal2 = document.getElementById(
                    "modalCreateCredential"
                  ) as HTMLDialogElement;
                  setSelectedApi(apiKey);
                  modal1?.close();
                  setTimeout(() => {
                    modal2?.showModal();
                  }, 100);
                }}
              >
                <img src={apiKey.logo} className="w-8 h-8" alt="" />
                <h2 className="text-lg font-light">{apiKey.name}</h2>
              </div>
            ))}
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Second Modal: After Selection */}
      <dialog id="modalCreateCredential" className="modal">
        <div className="modal-box">
          {selectedApi && (
            <>
              <div className="flex items-center gap-2 mb-6 space-x-4 p-3">
                <div>
                  <img src={selectedApi.logo} className="w-8 h-8" alt="" />
                </div>
                <div>
                  <h2 className="text-lg font-medium">{selectedApi.name}</h2>
                </div>
              </div>

              <Formik
                initialValues={{ name: "", apiKey: "" }}
                validate={validateCredential}
                onSubmit={handleCredentialSubmit}
              >
                {({ values, errors, touched, isSubmitting }) => (
                  <Form className="flex flex-col gap-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="name" className="font-light">
                        Credential Name
                      </label>
                      <Field
                        name="name"
                        type="text"
                        placeholder="Enter credential name"
                        className={`input w-full h-12 rounded-2xl ${
                          errors.name && touched.name
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300 bg-white hover:border-gray-400"
                        }`}
                      />
                      <ErrorMessage
                        name="name"
                        component="p"
                        className="text-red-500 text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor="apiKey" className="font-light">
                        {selectedApi.name} API Key
                      </label>
                      <Field
                        name="apiKey"
                        type="password"
                        placeholder="Enter API Key"
                        className={`input w-full h-12 rounded-2xl ${
                          errors.apiKey && touched.apiKey
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300 bg-white hover:border-gray-400"
                        }`}
                      />
                      <ErrorMessage
                        name="apiKey"
                        component="p"
                        className="text-red-500 text-sm"
                      />
                    </div>

                    <div className="modal-action">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            const modal = document.getElementById(
                              "modalCreateCredential"
                            ) as HTMLDialogElement;
                            modal?.close();
                            setSelectedApi(null);
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
                    </div>
                  </Form>
                )}
              </Formik>
            </>
          )}
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
