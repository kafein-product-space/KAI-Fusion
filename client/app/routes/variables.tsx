import { Formik, Form, Field, ErrorMessage } from "formik";
import { useSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash } from "lucide-react";
import AuthGuard from "~/components/AuthGuard";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useVariableStore } from "~/stores/variables";
import { timeAgo } from "~/lib/dateFormatter";

interface VariableFormValues {
  name: string;
  type: string;
  value: string;
}

interface Variable {
  id: string;
  name: string;
  value: string;
  type: string;
  updated: string;
  created: string;
}

function VariablesLayout() {
  const { enqueueSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingVariable, setEditingVariable] = useState<any>(null);

  const {
    variables,
    fetchVariables,
    isLoading,
    removeVariable: removeVariableFromStore,
    updateVariable,
    createVariable,
  } = useVariableStore();

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  const handleVariableSubmit = async (
    values: VariableFormValues,
    { resetForm }: any
  ) => {
    try {
      await createVariable(values);
      enqueueSnackbar("Variable created successfully", { variant: "success" });
      const modal = document.getElementById(
        "modalCreateVariable"
      ) as HTMLDialogElement;
      modal?.close();
      resetForm();
    } catch (error) {
      enqueueSnackbar("Failed to create variable", { variant: "error" });
    }
  };

  const validateVariable = (values: VariableFormValues) => {
    const errors: Partial<VariableFormValues> = {};

    if (!values.name) errors.name = "Variable name is required";
    else if (values.name.length < 2) errors.name = "Minimum 2 characters";
    else if (!/^[A-Z][A-Z0-9_]*$/i.test(values.name))
      errors.name = "Use letters, numbers, underscores";

    if (!values.value) errors.value = "Variable value is required";
    if (!values.type) errors.type = "Variable type is required";

    return errors;
  };

  const handleDelete = async (id: string) => {
    try {
      await removeVariableFromStore(id);
      enqueueSnackbar("Deleted", { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Delete failed", { variant: "error" });
    }
  };

  const filteredVariables = variables.filter(
    (variable) =>
      variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variable.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculation
  const totalItems = filteredVariables.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pagedVariables = filteredVariables.slice(startIdx, endIdx);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 p-10 m-10 bg-background">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium">Variables</h1>
              <p className="text-muted-foreground">
                Manage application variables and configuration
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex gap-2 p-3 flex-col items-start">
                <label className="input rounded-2xl border flex items-center gap-2 px-3 py-2">
                  <Search className="h-4 w-4 opacity-50" />
                  <input
                    type="search"
                    className="grow w-62"
                    placeholder="Search variables..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#9664E0] text-white rounded-lg hover:bg-[#8557d4]"
                onClick={() =>
                  (
                    document.getElementById(
                      "modalCreateVariable"
                    ) as HTMLDialogElement
                  )?.showModal()
                }
              >
                <Plus className="w-4 h-4" />
                Create Variable
              </button>
            </div>
          </div>

          {/* Table */}
          {pagedVariables.length === 0 ? (
            <div className="text-center py-12 bg-background rounded-lg">
              <p className="text-muted-foreground text-lg">
                No variables found
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-300 text-foreground">
              <table className="w-full text-sm bg-background">
                <thead className="bg-background text-left border-b border-gray-300">
                  <tr>
                    <th className="p-6">Name</th>
                    <th className="p-6">Value</th>
                    <th className="p-6">Type</th>
                    <th className="p-6">Created</th>
                    <th className="p-6">Updated</th>
                    <th className="p-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedVariables.map((variable) => (
                    <tr key={variable.id} className="border-b border-gray-200">
                      <td className="p-6 font-mono">{variable.name}</td>
                      <td className="p-6 font-mono text-sm truncate">
                        {variable.value}
                      </td>
                      <td className="p-6">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            variable.type === "static"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {variable.type}
                        </span>
                      </td>
                      <td className="p-6 text-sm">
                        {timeAgo(variable.created_at)}
                      </td>
                      <td className="p-6 text-sm">
                        {timeAgo(variable.updated_at)}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-1">
                          <button
                            title="Edit"
                            onClick={() => alert("Edit logic")}
                            className="p-2 rounded-lg hover:bg-purple-50 group"
                          >
                            <Pencil className="w-4 h-4 text-gray-400 group-hover:text-[#9664E0]" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDelete(variable.id)}
                            className="p-2 rounded-lg hover:bg-red-50 group"
                          >
                            <Trash className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                          </button>
                        </div>
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

                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    {"<"}
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
                    {">"}
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

      {/* Create Variable Modal (Aynı kalabilir) */}
      <dialog id="modalCreateVariable" className="modal">
        {/* ... modal içeriği aynı kalabilir ... */}
      </dialog>
    </div>
  );
}

export default function ProtectedVariablesLayout() {
  return (
    <AuthGuard>
      <VariablesLayout />
    </AuthGuard>
  );
}
