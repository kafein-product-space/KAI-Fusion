import { Formik, Form, Field, ErrorMessage } from "formik";
import { Pencil, Plus, Search, Trash } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router";

import DashboardSidebar from "~/components/dashboard/DashboardSidebar";

interface TemplateFormValues {
  name: string;
  tag: string;
  description: string;
}

interface Template {
  id: number;
  name: string;
  tag: string;
  description: string;
  created: string;
  updated: string;
}

export default function TemplatesLayout() {
  const [searchQuery, setSearchQuery] = useState("");

  const [templates, setTemplates] = useState<Template[]>([
    {
      id: 1,
      name: "E-commerce Order Processing",
      tag: "business",
      description: "Automated workflow for processing customer orders",
      created: "June 26th, 2025",
      updated: "June 26th, 2025",
    },
    {
      id: 2,
      name: "Lead Generation Pipeline",
      tag: "marketing",
      description: "Capture and nurture leads from various sources",
      created: "June 28th, 2025",
      updated: "June 30th, 2025",
    },
    {
      id: 3,
      name: "Customer Support Automation",
      tag: "support",
      description: "Route and manage customer support tickets",
      created: "July 1st, 2025",
      updated: "July 2nd, 2025",
    },
  ]);

  const handleTemplateSubmit = (
    values: TemplateFormValues,
    { resetForm }: any
  ) => {
    const newTemplate: Template = {
      id: templates.length + 1,
      name: values.name,
      tag: values.tag,
      description: values.description,
      created: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      updated: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    setTemplates([...templates, newTemplate]);

    // Modal'ı kapat ve formu temizle
    const modal = document.getElementById(
      "modalCreateTemplate"
    ) as HTMLDialogElement;
    modal?.close();
    resetForm();

    console.log("Template saved:", values);
  };

  const validateTemplate = (values: TemplateFormValues) => {
    const errors: Partial<TemplateFormValues> = {};

    if (!values.name) {
      errors.name = "Template name is required";
    } else if (values.name.length < 3) {
      errors.name = "Template name must be at least 3 characters";
    }

    if (!values.tag) {
      errors.tag = "Tag is required";
    }

    if (!values.description) {
      errors.description = "Description is required";
    } else if (values.description.length < 10) {
      errors.description = "Description must be at least 10 characters";
    }

    return errors;
  };

  const handleDelete = (id: number) => {
    setTemplates(templates.filter((template) => template.id !== id));
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTagColor = (tag: string) => {
    const colors = {
      business: "bg-blue-100 text-blue-800",
      marketing: "bg-green-100 text-green-800",
      support: "bg-purple-100 text-purple-800",
      automation: "bg-orange-100 text-orange-800",
      integration: "bg-red-100 text-red-800",
    };
    return colors[tag as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex h-screen w-screen">
              <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10 m-10 bg-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium text-start">Templates</h1>
              <p className="text-gray-600">
                Browse and reuse predefined workflow templates to speed up your
                automation setup
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
                      placeholder="Search templates..."
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
                      "modalCreateTemplate"
                    ) as HTMLDialogElement
                  )?.showModal()
                }
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {templates.length}
              </div>
              <div className="text-sm text-gray-600">Total Templates</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {templates.filter((t) => t.tag === "business").length}
              </div>
              <div className="text-sm text-gray-600">Business Templates</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {templates.filter((t) => t.tag === "marketing").length}
              </div>
              <div className="text-sm text-gray-600">Marketing Templates</div>
            </div>
          </div>

          {/* Table */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              {searchQuery ? (
                <>
                  <p className="text-gray-500 text-lg">
                    No templates found for "{searchQuery}"
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Try adjusting your search terms
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg">No templates found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Create your first template to get started
                  </p>
                  <button
                    className="mt-4 px-4 py-2 bg-[#9664E0] text-white rounded-lg hover:bg-[#8557d4] transition duration-200"
                    onClick={() =>
                      (
                        document.getElementById(
                          "modalCreateTemplate"
                        ) as HTMLDialogElement
                      )?.showModal()
                    }
                  >
                    Create Template
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F5F5] text-left border-b border-gray-300">
                  <tr>
                    <th className="p-6 font-medium text-base">Name</th>
                    <th className="p-6 font-medium text-base">Tag</th>
                    <th className="p-6 font-medium text-base">Description</th>
                    <th className="p-6 font-medium text-base">Created</th>
                    <th className="p-6 font-medium text-base">Updated</th>
                    <th className="p-6 font-medium text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition duration-150"
                    >
                      <td className="p-6">
                        <div className="font-medium text-gray-900">
                          {template.name}
                        </div>
                      </td>
                      <td className="p-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(
                            template.tag
                          )}`}
                        >
                          {template.tag}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {template.description}
                        </div>
                      </td>
                      <td className="p-6 text-gray-600 text-sm">
                        {template.created}
                      </td>
                      <td className="p-6 text-gray-600 text-sm">
                        {template.updated}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-1">
                          <Link
                            to="/canvas"
                            className="p-2 rounded-lg hover:bg-blue-50 transition duration-200 group"
                            title="Use template"
                          >
                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          </Link>
                          <button
                            className="p-2 rounded-lg hover:bg-purple-50 transition duration-200 group"
                            title="Edit template"
                          >
                            <Pencil className="w-4 h-4 text-gray-400 group-hover:text-[#9664E0]" />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-red-50 transition duration-200 group"
                            title="Delete template"
                            onClick={() =>
                              (
                                document.getElementById(
                                  `deleteModal-${template.id}`
                                ) as HTMLDialogElement
                              )?.showModal()
                            }
                          >
                            <Trash className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                          </button>
                        </div>

                        {/* Delete Modal for each template */}
                        <dialog
                          id={`deleteModal-${template.id}`}
                          className="modal"
                        >
                          <div className="modal-box">
                            <h3 className="font-bold text-lg">
                              Delete Template
                            </h3>
                            <p className="py-4">
                              Are you sure you want to delete{" "}
                              <strong>{template.name}</strong>?
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
                                  onClick={() => handleDelete(template.id)}
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

      {/* Create Template Modal */}
      <dialog id="modalCreateTemplate" className="modal">
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-xl mb-6">Create New Template</h3>

          <Formik
            initialValues={{ name: "", tag: "business", description: "" }}
            validate={validateTemplate}
            onSubmit={handleTemplateSubmit}
          >
            {({ values, errors, touched, isSubmitting }) => (
              <Form className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Template Name
                  </label>
                  <Field
                    name="name"
                    type="text"
                    placeholder="e.g., E-commerce Order Processing"
                    className={`input input-bordered w-full ${
                      errors.name && touched.name
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
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
                    htmlFor="tag"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Category Tag
                  </label>
                  <Field
                    as="select"
                    name="tag"
                    className={`select select-bordered w-full ${
                      errors.tag && touched.tag
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <option value="business">Business</option>
                    <option value="marketing">Marketing</option>
                    <option value="support">Support</option>
                    <option value="automation">Automation</option>
                    <option value="integration">Integration</option>
                  </Field>
                  <ErrorMessage
                    name="tag"
                    component="p"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <Field
                    as="textarea"
                    name="description"
                    placeholder="Describe what this template does..."
                    rows={3}
                    className={`textarea textarea-bordered w-full ${
                      errors.description && touched.description
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                  />
                  <ErrorMessage
                    name="description"
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
                          "modalCreateTemplate"
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
                      {isSubmitting ? "Creating..." : "Create Template"}
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
