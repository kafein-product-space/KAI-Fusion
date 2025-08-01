// VectorStoreOrchestratorConfigForm.tsx
import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Settings, Database, Layers } from "lucide-react";
import type { VectorStoreOrchestratorConfigFormProps } from "./types";

export default function VectorStoreOrchestratorConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: VectorStoreOrchestratorConfigFormProps) {
  return (
    <div className="relative p-2 w-64 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
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
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form className="space-y-3 w-full p-3">
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

            {/* Collection Name */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Collection Name
              </label>
              <Field
                name="collection_name"
                type="text"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="collection_name"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
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
              <label className="text-white text-xs font-medium mb-1 block">
                Pre Delete Collection
              </label>
              <Field
                name="pre_delete_collection"
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-slate-900/80 border rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="pre_delete_collection"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Enable HNSW Index */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Enable HNSW Index
              </label>
              <Field
                name="enable_hnsw_index"
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-slate-900/80 border rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="enable_hnsw_index"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                ✕
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="text-xs px-2 py-1 bg-blue-600 rounded text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                ✓
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
