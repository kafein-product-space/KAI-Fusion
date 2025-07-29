import { Formik, Form, Field, ErrorMessage } from "formik";
import { enqueueSnackbar, useSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Edit,
} from "lucide-react";
import AuthGuard from "~/components/AuthGuard";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useVariableStore } from "~/stores/variables";
import { timeAgo } from "~/lib/dateFormatter";
import Loading from "~/components/Loading";

interface VariableFormValues {
  name: string;
  type: string;
  value: string;
}

function VariablesLayout() {
  const { enqueueSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingVariable, setEditingVariable] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [page, setPage] = useState(1);

  const {
    variables,
    fetchVariables,
    isLoading,
    removeVariable: removeVariableFromStore,
    updateVariable,
    createVariable,
  } = useVariableStore();

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

  const handleVariableUpdate = async (
    values: VariableFormValues,
    { resetForm }: any
  ) => {
    try {
      if (editingVariable) {
        await updateVariable(editingVariable.id, values);
        enqueueSnackbar("Variable updated successfully", {
          variant: "success",
        });
        const modal = document.getElementById(
          "modalUpdateVariable"
        ) as HTMLDialogElement;
        modal?.close();
        setEditingVariable(null);
        resetForm();
      }
    } catch (error) {
      enqueueSnackbar("Failed to update variable", { variant: "error" });
    }
  };

  const handleEditClick = (variable: any) => {
    setEditingVariable(variable);
    const modal = document.getElementById(
      "modalUpdateVariable"
    ) as HTMLDialogElement;
    modal?.showModal();
  };

  const validateVariable = (values: VariableFormValues) => {
    const errors: Partial<VariableFormValues> = {};
    if (!values.name) {
      errors.name = "Variable name is required";
    } else if (values.name.length < 2) {
      errors.name = "Must be at least 2 characters";
    } else if (!/^[A-Z][A-Z0-9_]*$/i.test(values.name)) {
      errors.name = "Only letters, numbers, and underscores allowed";
    }
    if (!values.value) errors.value = "Value is required";
    if (!values.type) errors.type = "Type is required";
    return errors;
  };

  const handleDelete = async (id: string) => {
    try {
      await removeVariableFromStore(id);
      enqueueSnackbar("Variable deleted", { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Failed to delete", { variant: "error" });
    }
  };

  const filteredVariables = variables.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-4xl font-medium text-start">Variables</h1>
              <p className="text-muted-foreground">
                Manage your application variables and configuration values
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex gap-2 p-3 flex-col items-start">
                <label className="input w-full rounded-2xl border flex items-center gap-2 px-3 py-2">
                  <Search className="h-4 w-4 opacity-50" />
                  <input
                    type="search"
                    className="grow w-62"
                    placeholder="Search variables..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#9664E0] text-white rounded-lg hover:bg-[#8557d4] transition"
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

          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loading size="sm" />
            </div>
          ) : pagedVariables.length === 0 ? (
            <div className="text-center py-12 bg-background rounded-lg">
              <p className="text-muted-foreground text-lg">
                No variables found
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-300 text-foreground">
                <table className="w-full text-sm bg-background text-foreground">
                  <thead className="bg-background text-left border-b border-gray-300">
                    <tr>
                      <th className="p-6 font-medium text-base">Name</th>
                      <th className="p-6 font-medium text-base">Value</th>
                      <th className="p-6 font-medium text-base">Type</th>
                      <th className="p-6 font-medium text-base">Created</th>
                      <th className="p-6 font-medium text-base">Updated</th>
                      <th className="p-6 font-medium text-base">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedVariables.map((variable) => (
                      <tr
                        key={variable.id}
                        className="border-b border-gray-200"
                      >
                        <td className="p-6 font-mono font-medium">
                          {variable.name}
                        </td>
                        <td className="p-6 font-mono text-sm max-w-xs truncate">
                          {variable.value}
                        </td>
                        <td className="p-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                          <div className="flex items-center gap-2">
                            <button
                              className="p-2 rounded-lg hover:bg-blue-50 group"
                              title="Edit variable"
                              onClick={() => handleEditClick(variable)}
                            >
                              <Edit className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-red-50 group"
                              title="Delete variable"
                              onClick={() => handleDelete(variable.id)}
                            >
                              <Trash className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ✅ Pagination bar */}
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
            </>
          )}
        </div>

        {/* Create Variable Modal */}
        <dialog
          id="modalCreateVariable"
          className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
        >
          <div className="modal-box max-w-md bg-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Variable</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  const modal = document.getElementById(
                    "modalCreateVariable"
                  ) as HTMLDialogElement;
                  modal?.close();
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Formik
              initialValues={{
                name: "",
                type: "static",
                value: "",
              }}
              validate={validateVariable}
              onSubmit={handleVariableSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variable Name
                    </label>
                    <Field
                      name="name"
                      className="input input-bordered w-full"
                      placeholder="VARIABLE_NAME"
                    />
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <Field
                      as="select"
                      name="type"
                      className="select select-bordered w-full"
                    >
                      <option value="static">Static</option>
                      <option value="dynamic">Dynamic</option>
                    </Field>
                    <ErrorMessage
                      name="type"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    <Field
                      as="textarea"
                      name="value"
                      className="textarea textarea-bordered w-full h-24"
                      placeholder="Enter variable value..."
                    />
                    <ErrorMessage
                      name="value"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        const modal = document.getElementById(
                          "modalCreateVariable"
                        ) as HTMLDialogElement;
                        modal?.close();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="loading loading-spinner loading-sm"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Create
                        </>
                      )}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </dialog>

        {/* Update Variable Modal */}
        <dialog
          id="modalUpdateVariable"
          className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
        >
          <div className="modal-box max-w-md bg-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Variable</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  const modal = document.getElementById(
                    "modalUpdateVariable"
                  ) as HTMLDialogElement;
                  modal?.close();
                  setEditingVariable(null);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingVariable && (
              <Formik
                initialValues={{
                  name: editingVariable.name,
                  type: editingVariable.type,
                  value: editingVariable.value,
                }}
                validate={validateVariable}
                onSubmit={handleVariableUpdate}
                enableReinitialize
              >
                {({ isSubmitting }) => (
                  <Form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Variable Name
                      </label>
                      <Field
                        name="name"
                        className="input input-bordered w-full"
                        placeholder="VARIABLE_NAME"
                      />
                      <ErrorMessage
                        name="name"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <Field
                        as="select"
                        name="type"
                        className="select select-bordered w-full"
                      >
                        <option value="static">Static</option>
                        <option value="dynamic">Dynamic</option>
                      </Field>
                      <ErrorMessage
                        name="type"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <Field
                        as="textarea"
                        name="value"
                        className="textarea textarea-bordered w-full h-24"
                        placeholder="Enter variable value..."
                      />
                      <ErrorMessage
                        name="value"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          const modal = document.getElementById(
                            "modalUpdateVariable"
                          ) as HTMLDialogElement;
                          modal?.close();
                          setEditingVariable(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Update
                          </>
                        )}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </div>
        </dialog>
      </main>
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
