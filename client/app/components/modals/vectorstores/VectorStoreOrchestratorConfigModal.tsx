import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Formik, Form, Field } from "formik";
import { Database, Settings, Layers, Search, Zap } from "lucide-react";

interface VectorStoreOrchestratorConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface VectorStoreOrchestratorConfig {
  connection_string: string;
  collection_name: string;
  pre_delete_collection: boolean;
  search_algorithm: string;
  search_k: number;
  score_threshold: number;
  batch_size: number;
  enable_hnsw_index: boolean;
}

const searchAlgorithms = [
  {
    value: "cosine",
    label: "Cosine Similarity",
    description:
      "Best for most text embeddings, measures angle between vectors",
  },
  {
    value: "euclidean",
    label: "Euclidean Distance",
    description: "L2 distance, good for normalized embeddings",
  },
  {
    value: "inner_product",
    label: "Inner Product",
    description: "Dot product similarity, fast but requires normalized vectors",
  },
];

const VectorStoreOrchestratorConfigModal = forwardRef<
  HTMLDialogElement,
  VectorStoreOrchestratorConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: VectorStoreOrchestratorConfig = {
    connection_string: nodeData?.connection_string || "",
    collection_name: nodeData?.collection_name || "",
    pre_delete_collection: nodeData?.pre_delete_collection || false,
    search_algorithm: nodeData?.search_algorithm || "cosine",
    search_k: nodeData?.search_k || 6,
    score_threshold: nodeData?.score_threshold || 0.0,
    batch_size: nodeData?.batch_size || 100,
    enable_hnsw_index: nodeData?.enable_hnsw_index !== false,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-purple-500/10 backdrop-blur-xl">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Vector Store Orchestrator
            </h3>
            <p className="text-slate-400 text-sm">
              Configure your vector store orchestration and retrieval settings
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values }) => (
            <Form className="space-y-6">
              {/* Database Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-white font-semibold">
                    Database Configuration
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Connection String
                    </label>
                    <Field
                      name="connection_string"
                      type="password"
                      placeholder="postgresql://user:pass@host:port/db"
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                    <div className="text-xs text-slate-400 mt-2">
                      Full database connection string with credentials
                    </div>
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Collection Name
                    </label>
                    <Field
                      name="collection_name"
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="orchestrator_collection"
                    />
                    <div className="text-xs text-slate-400 mt-2">
                      Vector collection name (auto-generated if empty)
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                    <div className="flex items-center space-x-3">
                      <Database className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-white text-sm font-medium">
                          Pre-delete Collection
                        </div>
                        <div className="text-slate-400 text-xs">
                          Delete existing collection before storing new
                          documents
                        </div>
                      </div>
                    </div>
                    <Field name="pre_delete_collection">
                      {({ field }: any) => (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            {...field}
                            type="checkbox"
                            checked={field.value}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
                        </label>
                      )}
                    </Field>
                  </div>
                </div>
              </div>

              {/* Retriever Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Search className="w-5 h-5 text-green-400" />
                  <h4 className="text-white font-semibold">
                    Retriever Configuration
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Search Algorithm
                    </label>
                    <Field name="search_algorithm">
                      {({ field }: any) => (
                        <select
                          {...field}
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                        >
                          {searchAlgorithms.map((algo) => (
                            <option key={algo.value} value={algo.value}>
                              {algo.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                    <div className="text-xs text-slate-400 mt-2">
                      {
                        searchAlgorithms.find(
                          (a) => a.value === values.search_algorithm
                        )?.description
                      }
                    </div>
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Number of Documents to Retrieve (K): {values.search_k}
                    </label>
                    <Field name="search_k">
                      {({ field }: any) => (
                        <input
                          {...field}
                          type="range"
                          min="1"
                          max="50"
                          className="range range-success w-full"
                        />
                      )}
                    </Field>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>1</span>
                      <span className="font-bold text-white">
                        {values.search_k}
                      </span>
                      <span>50</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Score Threshold: {values.score_threshold.toFixed(2)}
                    </label>
                    <Field name="score_threshold">
                      {({ field }: any) => (
                        <input
                          {...field}
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          className="range range-warning w-full"
                        />
                      )}
                    </Field>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>0.0</span>
                      <span className="font-bold text-white">
                        {values.score_threshold.toFixed(2)}
                      </span>
                      <span>1.0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h4 className="text-white font-semibold">
                    Performance Configuration
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Batch Size: {values.batch_size}
                    </label>
                    <Field name="batch_size">
                      {({ field }: any) => (
                        <input
                          {...field}
                          type="range"
                          min="10"
                          max="1000"
                          step="10"
                          className="range range-accent w-full"
                        />
                      )}
                    </Field>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>10</span>
                      <span className="font-bold text-white">
                        {values.batch_size}
                      </span>
                      <span>1000</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-white text-sm font-medium">
                          Enable HNSW Index
                        </div>
                        <div className="text-slate-400 text-xs">
                          Use HNSW index for faster similarity search
                        </div>
                      </div>
                    </div>
                    <Field name="enable_hnsw_index">
                      {({ field }: any) => (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            {...field}
                            type="checkbox"
                            checked={field.value}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-500 peer-checked:to-orange-600"></div>
                        </label>
                      )}
                    </Field>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4" />
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default VectorStoreOrchestratorConfigModal;
