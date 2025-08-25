import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Brain, Key, Lock, Settings, BarChart3, Sliders, CheckCircle, Activity } from "lucide-react";

interface OpenAIEmbeddingsConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface OpenAIEmbeddingsConfig {
  embed_model: string;
  openai_api_key: string;
  batch_size: number;
  max_retries: number;
  request_timeout: number;
  include_metadata_in_embedding: boolean;
  normalize_vectors: boolean;
  enable_cost_estimation: boolean;
}

// Updated model list to match backend
const EMBEDDING_MODELS = [
  {
    value: "text-embedding-3-small",
    label: "Text Embedding 3 Small ⭐",
    description:
      "Latest small model, good performance/cost ratio • 1536D • $0.00002/1K tokens",
  },
  {
    value: "text-embedding-3-large",
    label: "Text Embedding 3 Large",
    description:
      "Latest large model, highest quality embeddings • 3072D • $0.00013/1K tokens",
  },
  {
    value: "text-embedding-ada-002",
    label: "Text Embedding Ada 002",
    description: "Legacy model, still reliable • 1536D • $0.0001/1K tokens",
  },
];

const OpenAIEmbeddingsModal = forwardRef<
  HTMLDialogElement,
  OpenAIEmbeddingsConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: OpenAIEmbeddingsConfig = {
    embed_model: nodeData?.embed_model || "text-embedding-3-small",
    openai_api_key: nodeData?.openai_api_key || "",
    batch_size: nodeData?.batch_size || 100,
    max_retries: nodeData?.max_retries || 3,
    request_timeout: nodeData?.request_timeout || 60,
    include_metadata_in_embedding: nodeData?.include_metadata_in_embedding || false,
    normalize_vectors: nodeData?.normalize_vectors !== false,
    enable_cost_estimation: nodeData?.enable_cost_estimation !== false,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">OpenAI Document Embedder</h3>
            <p className="text-slate-400 text-sm">
              Configure OpenAI embeddings for document processing with advanced analytics
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.openai_api_key) {
              errors.openai_api_key = "OpenAI API key is required.";
            }
            return errors;
          }}
          onSubmit={(values) => {
            onSave(values);
            dialogRef.current?.close();
          }}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <label className="label">
                  <span className="label-text text-white font-medium">Embedding Model</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {EMBEDDING_MODELS.map((model) => (
                    <label
                      key={model.value}
                      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        values.embed_model === model.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="embed_model"
                        value={model.value}
                        className="sr-only"
                        onChange={(e) => setFieldValue("embed_model", e.target.value)}
                      />
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                            <Brain className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{model.label}</span>
                            {model.value === "text-embedding-3-small" && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mt-1">{model.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="label">
                  <span className="label-text text-white font-medium">OpenAI API Key</span>
                </label>
                <Field
                  name="openai_api_key"
                  type="password"
                  className="input input-bordered w-full bg-slate-800 border-slate-600 text-white placeholder-slate-400"
                  placeholder="sk-..."
                />
                <ErrorMessage name="openai_api_key" component="div" className="text-red-400 text-sm" />
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span className="text-white font-medium">Advanced Settings</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Batch Size */}
                  <div className="space-y-2">
                    <label className="label">
                      <span className="label-text text-white">Batch Size</span>
                    </label>
                    <Field
                      name="batch_size"
                      type="number"
                      className="input input-bordered w-full bg-slate-800 border-slate-600 text-white"
                      min={1}
                      max={500}
                    />
                    <p className="text-slate-400 text-xs">Number of chunks to process in each batch</p>
                  </div>

                  {/* Max Retries */}
                  <div className="space-y-2">
                    <label className="label">
                      <span className="label-text text-white">Max Retries</span>
                    </label>
                    <Field
                      name="max_retries"
                      type="number"
                      className="input input-bordered w-full bg-slate-800 border-slate-600 text-white"
                      min={0}
                      max={5}
                    />
                    <p className="text-slate-400 text-xs">Maximum retries for failed requests</p>
                  </div>

                  {/* Request Timeout */}
                  <div className="space-y-2">
                    <label className="label">
                      <span className="label-text text-white">Request Timeout (seconds)</span>
                    </label>
                    <Field
                      name="request_timeout"
                      type="number"
                      className="input input-bordered w-full bg-slate-800 border-slate-600 text-white"
                      min={10}
                      max={300}
                    />
                    <p className="text-slate-400 text-xs">Timeout for API requests</p>
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <Field
                      name="include_metadata_in_embedding"
                      type="checkbox"
                      className="checkbox checkbox-primary"
                    />
                    <div>
                      <span className="text-white font-medium">Include Metadata in Embedding</span>
                      <p className="text-slate-400 text-sm">Include chunk metadata in the embedding text</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <Field
                      name="normalize_vectors"
                      type="checkbox"
                      className="checkbox checkbox-primary"
                    />
                    <div>
                      <span className="text-white font-medium">Normalize Vectors</span>
                      <p className="text-slate-400 text-sm">Normalize embedding vectors to unit length</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <Field
                      name="enable_cost_estimation"
                      type="checkbox"
                      className="checkbox checkbox-primary"
                    />
                    <div>
                      <span className="text-white font-medium">Enable Cost Estimation</span>
                      <p className="text-slate-400 text-sm">Calculate and display embedding cost estimates</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  className="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => dialogRef.current?.close()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary bg-gradient-to-r from-purple-500 to-pink-600 border-0"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default OpenAIEmbeddingsModal;
