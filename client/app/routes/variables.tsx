import { Formik, Form, Field, ErrorMessage } from "formik";
import { enqueueSnackbar, useSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash } from "lucide-react"; // Icon import'ları eklendi
import AuthGuard from "~/components/AuthGuard";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { removeVariable } from "~/services/variableService";
import { useVariableStore } from "~/stores/variables";
import { timeAgo } from "~/lib/dateFormatter";
import Loading from "~/components/Loading";
interface VariableFormValues {
  name: string;
  type: string;
  value: string;
}

interface Variable {
  id: string; // number'dan string'e değiştirildi
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

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]); // dependency array'e fetchVariables eklendi

  const handleVariableSubmit = async (
    values: VariableFormValues,
    { resetForm }: any
  ) => {
    try {
      await createVariable(values);
      enqueueSnackbar("Variable created successfully", { variant: "success" });

      // Modal'ı kapat ve formu temizle
      const modal = document.getElementById(
        "modalCreateVariable"
      ) as HTMLDialogElement;
      modal?.close();
      resetForm();
    } catch (error) {
      console.log(error);
      enqueueSnackbar("Failed to create variable", { variant: "error" });
    }
  };

  const validateVariable = (values: VariableFormValues) => {
    const errors: Partial<VariableFormValues> = {};

    if (!values.name) {
      errors.name = "Variable name is required";
    } else if (values.name.length < 2) {
      errors.name = "Variable name must be at least 2 characters";
    } else if (!/^[A-Z][A-Z0-9_]*$/i.test(values.name)) {
      errors.name =
        "Variable name should contain only letters, numbers, and underscores";
    }

    if (!values.value) {
      errors.value = "Variable value is required";
    }

    if (!values.type) {
      errors.type = "Variable type is required";
    }

    return errors;
  };

  const handleDelete = async (id: string) => {
    try {
      await removeVariableFromStore(id); // Store method kullanıldı
      enqueueSnackbar("Variable deleted successfully", { variant: "success" });
    } catch (error) {
      console.log(error);
      enqueueSnackbar("Failed to delete variable", { variant: "error" });
    }
  };

  const filteredVariables = variables.filter(
    (variable) =>
      variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variable.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10 m-10 bg-background">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium text-start">Variables</h1>
              <p className="text-muted-foreground">
                Manage your application variables and configuration values
              </p>
            </div>

            {/* Search & Create Button */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6 justify-center">
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
              </div>

              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#9664E0] text-white rounded-lg hover:bg-[#8557d4] transition duration-200"
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
          {isLoading ? (
            <div className="flex items-center justify-center ">
              <Loading size="sm" />
            </div>
          ) : filteredVariables.length === 0 ? (
            <div className="text-center py-12 bg-background rounded-lg">
              {searchQuery ? (
                <>
                  <p className="text-muted-foreground text-lg">
                    No variables found for "{searchQuery}"
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Try adjusting your search terms
                  </p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-lg">
                    No variables found
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Create your first variable to get started
                  </p>
                  <button
                    className="mt-4 px-4 py-2 bg-[#9664E0] text-white rounded-lg hover:bg-[#8557d4] transition duration-200"
                    onClick={() =>
                      (
                        document.getElementById(
                          "modalCreateVariable"
                        ) as HTMLDialogElement
                      )?.showModal()
                    }
                  >
                    Create Variable
                  </button>
                </>
              )}
            </div>
          ) : (
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
                  {filteredVariables.map((variable) => (
                    <tr
                      key={variable.id}
                      className="border-b border-gray-200 text-foreground transition duration-150"
                    >
                      <td className="p-6">
                        <div className="font-mono font-medium ">
                          {variable.name}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="font-mono text-sm  max-w-xs truncate">
                          {variable.value}
                        </div>
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
                      <td className="p-6  text-sm">
                        {timeAgo(variable.created_at)}
                      </td>
                      <td className="p-6  text-sm">
                        {timeAgo(variable.updated_at)}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-1">
                          <button
                            className="p-2 rounded-lg hover:bg-purple-50 transition duration-200 group"
                            title="Edit variable"
                            onClick={() => {
                              setEditingVariable(variable);
                              (
                                document.getElementById(
                                  `editModal-${variable.id}`
                                ) as HTMLDialogElement
                              )?.showModal();
                            }}
                          >
                            <Pencil className="w-4 h-4 text-gray-400 group-hover:text-[#9664E0]" />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-red-50 transition duration-200 group"
                            title="Delete variable"
                            onClick={() =>
                              (
                                document.getElementById(
                                  `deleteModal-${variable.id}`
                                ) as HTMLDialogElement
                              )?.showModal()
                            }
                          >
                            <Trash className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                          </button>
                        </div>

                        {/* Edit Modal for each variable */}
                        <dialog
                          id={`editModal-${variable.id}`}
                          className="modal"
                        >
                          <div className="modal-box max-w-md">
                            <h3 className="font-bold text-xl mb-6">
                              Edit Variable
                            </h3>
                            <Formik
                              initialValues={{
                                name: variable.name,
                                type: variable.type,
                                value: variable.value,
                              }}
                              enableReinitialize
                              validate={validateVariable}
                              onSubmit={async (values, { setSubmitting }) => {
                                await updateVariable(variable.id, values);
                                setSubmitting(false);
                                setEditingVariable(null);
                                const modal = document.getElementById(
                                  `editModal-${variable.id}`
                                ) as HTMLDialogElement;
                                modal?.close();
                              }}
                            >
                              {({ values, errors, touched, isSubmitting }) => (
                                <Form className="space-y-6">
                                  <div className="space-y-2">
                                    <label
                                      htmlFor="name"
                                      className="block text-sm font-medium text-gray-700"
                                    >
                                      Variable Name
                                    </label>
                                    <Field
                                      name="name"
                                      type="text"
                                      placeholder="e.g., API_BASE_URL"
                                      className={`input input-bordered w-full ${
                                        errors.name && touched.name
                                          ? "border-red-300 bg-red-50"
                                          : "border-gray-300 bg-background text-foreground"
                                      }`}
                                    />
                                    <ErrorMessage
                                      name="name"
                                      component="p"
                                      className="text-red-500 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label
                                      htmlFor="type"
                                      className="block text-sm font-medium text-gray-700"
                                    >
                                      Variable Type
                                    </label>
                                    <Field
                                      as="select"
                                      name="type"
                                      className={`select select-bordered w-full ${
                                        errors.type && touched.type
                                          ? "border-red-300 bg-red-50"
                                          : "border-gray-300 bg-background text-foreground"
                                      }`}
                                    >
                                      <option value="static">
                                        Static - Fixed value
                                      </option>
                                      <option value="dynamic">
                                        Dynamic - Can change at runtime
                                      </option>
                                    </Field>
                                    <ErrorMessage
                                      name="type"
                                      component="p"
                                      className="text-red-500 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label
                                      htmlFor="value"
                                      className="block text-sm font-medium text-gray-700"
                                    >
                                      Variable Value
                                    </label>
                                    <Field
                                      name="value"
                                      type="text"
                                      placeholder="Enter the variable value"
                                      className={`input input-bordered w-full ${
                                        errors.value && touched.value
                                          ? "border-red-300 bg-red-50"
                                          : "border-gray-300 bg-background text-foreground"
                                      }`}
                                    />
                                    <ErrorMessage
                                      name="value"
                                      component="p"
                                      className="text-red-500 text-sm"
                                    />
                                  </div>
                                  <div className="modal-action pt-6">
                                    <div className="flex gap-3 w-full">
                                      <button
                                        type="button"
                                        className="btn btn-outline flex-1"
                                        onClick={() => {
                                          setEditingVariable(null);
                                          const modal = document.getElementById(
                                            `editModal-${variable.id}`
                                          ) as HTMLDialogElement;
                                          modal?.close();
                                        }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        className="btn bg-[#9664E0] hover:bg-[#8557d4] text-white flex-1"
                                        disabled={isSubmitting}
                                      >
                                        {isSubmitting
                                          ? "Saving..."
                                          : "Save Changes"}
                                      </button>
                                    </div>
                                  </div>
                                </Form>
                              )}
                            </Formik>
                          </div>
                        </dialog>
                        {/* Delete Modal for each variable */}
                        <dialog
                          id={`deleteModal-${variable.id}`}
                          className="modal"
                        >
                          <div className="modal-box">
                            <h3 className="font-bold text-lg">
                              Delete Variable
                            </h3>
                            <p className="py-4">
                              Are you sure you want to delete{" "}
                              <strong className="font-mono">
                                {variable.name}
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
                                  type="button"
                                  className="btn bg-red-500 hover:bg-red-600 text-white"
                                  onClick={() => {
                                    handleDelete(variable.id);
                                    // Modal'ı kapat
                                    const modal = document.getElementById(
                                      `deleteModal-${variable.id}`
                                    ) as HTMLDialogElement;
                                    modal?.close();
                                  }}
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
            </div>
          )}
        </div>
      </main>

      {/* Create Variable Modal */}
      <dialog id="modalCreateVariable" className="modal">
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-xl mb-6">Create New Variable</h3>

          <Formik
            initialValues={{ name: "", type: "static", value: "" }}
            validate={validateVariable}
            onSubmit={handleVariableSubmit}
          >
            {({ values, errors, touched, isSubmitting }) => (
              <Form className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Variable Name
                  </label>
                  <Field
                    name="name"
                    type="text"
                    placeholder="e.g., API_BASE_URL"
                    className={`input input-bordered w-full ${
                      errors.name && touched.name
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-background text-foreground"
                    }`}
                  />
                  <ErrorMessage
                    name="name"
                    component="p"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Variable Type
                  </label>
                  <Field
                    as="select"
                    name="type"
                    className={`select select-bordered w-full ${
                      errors.type && touched.type
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-background text-foreground"
                    }`}
                  >
                    <option value="static">Static - Fixed value</option>
                    <option value="dynamic">
                      Dynamic - Can change at runtime
                    </option>
                  </Field>
                  <ErrorMessage
                    name="type"
                    component="p"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="value"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Variable Value
                  </label>
                  <Field
                    name="value"
                    type="text"
                    placeholder="Enter the variable value"
                    className={`input input-bordered w-full ${
                      errors.value && touched.value
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-background text-foreground"
                    }`}
                  />
                  <ErrorMessage
                    name="value"
                    component="p"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="modal-action pt-6">
                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      className="btn btn-outline flex-1"
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
                      className="btn bg-[#9664E0] hover:bg-[#8557d4] text-white flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Create Variable"}
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
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
