// VectorStoreOrchestratorConfigForm.tsx
import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Database,
  Layers,
  Tag,
  Filter,
  Search,
  Zap,
} from "lucide-react";
import type { VectorStoreOrchestratorConfigFormProps } from "./types";
import JSONEditor from "~/components/common/JSONEditor";
import TabNavigation from "~/components/common/TabNavigation";

export default function VectorStoreOrchestratorConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: VectorStoreOrchestratorConfigFormProps) {
  const [activeTab, setActiveTab] = useState("data");

  const tabs = [
    {
      id: "data",
      label: "Data",
      icon: Database,
      description: "Database connection and collection settings",
    },
    {
      id: "metadata",
      label: "Metadata",
      icon: Tag,
      description: "Custom metadata and strategy configuration",
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      description: "Search algorithm and performance settings",
    },
  ];

  return (
    <div className="relative p-2 w-80 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            Vector Store Orchestrator
          </span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={(values, { setSubmitting }) => {
          console.log("Form submitted with values:", values);
          onSubmit(values);
          setSubmitting(false);
        }}
        enableReinitialize
      >
        {({
          values,
          errors,
          touched,
          isSubmitting,
          isValid,
          handleSubmit,
          setFieldValue,
          setFieldTouched,
        }) => {
          // Tab değişiminde sadece tab'ı değiştir, form submit'i tetikleme
          const handleTabChange = (tabId: string) => {
            // Form submit'i tetiklememek için preventDefault
            setActiveTab(tabId);
          };

          return (
            <Form className="space-y-3 w-full p-3" onSubmit={handleSubmit}>
              {/* Tab Navigation */}
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mb-4"
              />

              {/* Tab Content */}
              <div className="space-y-3">
                {/* Data Configuration Tab */}
                {activeTab === "data" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      <Database className="w-3 h-3" />
                      Data Configuration
                    </div>

                    {/* Connection String */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Connection String
                      </label>
                      <Field
                        name="connection_string"
                        type="password"
                        className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <ErrorMessage
                        name="connection_string"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Collection Name - Required */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Collection Name *
                      </label>
                      <Field
                        name="collection_name"
                        type="text"
                        placeholder="e.g., amazon_products, user_manuals, company_docs"
                        className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <ErrorMessage
                        name="collection_name"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Vector collection name - separates different datasets
                        (REQUIRED for data isolation)
                      </p>
                    </div>

                    {/* Table Prefix - New */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Table Prefix (Optional)
                      </label>
                      <Field
                        name="table_prefix"
                        type="text"
                        placeholder="e.g., project1_, client_a_"
                        className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <ErrorMessage
                        name="table_prefix"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Custom table prefix for complete database isolation
                        (optional)
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata Configuration Tab */}
                {activeTab === "metadata" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      <Tag className="w-3 h-3" />
                      Metadata Configuration
                    </div>

                    {/* Custom Metadata */}
                    <JSONEditor
                      value={values.custom_metadata || "{}"}
                      onChange={(value) =>
                        setFieldValue("custom_metadata", value)
                      }
                      label="Custom Metadata"
                      placeholder='{"source": "amazon_catalog", "category": "electronics", "version": "2024"}'
                      description="Custom metadata to add to all documents (JSON format)"
                      height={80}
                      error={errors.custom_metadata}
                    />

                    {/* Preserve Document Metadata */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-xs font-medium mb-1">
                        <Field
                          name="preserve_document_metadata"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                          onMouseDown={(e: any) => e.stopPropagation()}
                          onTouchStart={(e: any) => e.stopPropagation()}
                        />
                        Preserve Document Metadata
                      </label>
                      <p className="text-xs text-slate-400 ml-5">
                        Keep original document metadata alongside custom
                        metadata
                      </p>
                      <ErrorMessage
                        name="preserve_document_metadata"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Metadata Strategy */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Metadata Strategy
                      </label>
                      <Field
                        as="select"
                        name="metadata_strategy"
                        className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      >
                        <option value="merge">
                          Merge (custom overrides document)
                        </option>
                        <option value="replace">
                          Replace (only custom metadata)
                        </option>
                        <option value="document_only">Document Only</option>
                      </Field>
                      <p className="text-xs text-slate-400 mt-1">
                        How to handle metadata conflicts
                      </p>
                      <ErrorMessage
                        name="metadata_strategy"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Search Configuration Tab */}
                {activeTab === "search" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-green-400 uppercase tracking-wider">
                      <Search className="w-3 h-3" />
                      Search Configuration
                    </div>

                    {/* Search Algorithm */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Search Algorithm
                      </label>
                      <Field
                        as="select"
                        name="search_algorithm"
                        className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      >
                        <option value="cosine">Cosine Similarity</option>
                        <option value="euclidean">Euclidean Distance</option>
                        <option value="inner_product">Inner Product</option>
                      </Field>
                      <ErrorMessage
                        name="search_algorithm"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Search K */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Search K
                      </label>
                      <Field
                        name="search_k"
                        type="range"
                        min={1}
                        max={50}
                        className="w-full text-white"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <div className="flex justify-between text-xs text-gray-300 mt-1">
                        <span>1</span>
                        <span className="font-bold text-blue-400">
                          {values.search_k}
                        </span>
                        <span>50</span>
                      </div>
                      <ErrorMessage
                        name="search_k"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Score Threshold */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Score Threshold
                      </label>
                      <Field
                        name="score_threshold"
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        className="w-full text-white"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <div className="flex justify-between text-xs text-gray-300 mt-1">
                        <span>0.0</span>
                        <span className="font-bold text-purple-400">
                          {values.score_threshold?.toFixed(1) || "0.0"}
                        </span>
                        <span>1.0</span>
                      </div>
                      <ErrorMessage
                        name="score_threshold"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Batch Size */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Batch Size
                      </label>
                      <Field
                        name="batch_size"
                        type="range"
                        min={10}
                        max={1000}
                        step={10}
                        className="w-full text-white"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <div className="flex justify-between text-xs text-gray-300 mt-1">
                        <span>10</span>
                        <span className="font-bold text-green-400">
                          {values.batch_size}
                        </span>
                        <span>1000</span>
                      </div>
                      <ErrorMessage
                        name="batch_size"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Pre Delete Collection */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-xs font-medium mb-1">
                        <Field
                          name="pre_delete_collection"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                          onMouseDown={(e: any) => e.stopPropagation()}
                          onTouchStart={(e: any) => e.stopPropagation()}
                        />
                        Pre Delete Collection
                      </label>
                      <p className="text-xs text-slate-400 ml-5">
                        Delete existing collection before creating new one
                      </p>
                      <ErrorMessage
                        name="pre_delete_collection"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Enable HNSW Index */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-xs font-medium mb-1">
                        <Field
                          name="enable_hnsw_index"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                          onMouseDown={(e: any) => e.stopPropagation()}
                          onTouchStart={(e: any) => e.stopPropagation()}
                        />
                        Enable HNSW Index
                      </label>
                      <p className="text-xs text-slate-400 ml-5">
                        Use HNSW index for faster similarity search
                      </p>
                      <ErrorMessage
                        name="enable_hnsw_index"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex space-x-2 pt-2 border-t border-slate-600/30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCancel();
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 rounded text-white hover:bg-slate-600 transition-colors"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                >
                  ✕
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting || !isValid || Object.keys(errors).length > 0
                  }
                  className={`text-xs px-2 py-1 rounded text-white transition-colors ${
                    isSubmitting || !isValid || Object.keys(errors).length > 0
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                >
                  {isSubmitting ? "..." : "✓"}
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
