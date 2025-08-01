import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import { Formik, Form, Field } from "formik";
import { Database, Trash, Settings } from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";

interface PostgreSQLVectorStoreConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface PostgreSQLVectorStoreConfig {
  connection_string: string;
  collection_name: string;
  pre_delete_collection: boolean;
  fallback_embed_model: string;
  openai_api_key: string;
  search_algorithm: string;
  search_k: number;
  score_threshold: number;
  batch_size: number;
  enable_hnsw_index: boolean;
}

const embeddingModels = [
  {
    value: "text-embedding-3-small",
    label: "Text Embedding 3 Small",
    description: "1536D, $0.00002/1K tokens",
  },
  {
    value: "text-embedding-3-large",
    label: "Text Embedding 3 Large",
    description: "3072D, $0.00013/1K tokens",
  },
  {
    value: "text-embedding-ada-002",
    label: "Text Embedding Ada 002",
    description: "1536D, $0.00010/1K tokens",
  },
];

const searchAlgorithms = [
  {
    value: "cosine",
    label: "Cosine Similarity",
    description: "Most common, good for normalized vectors",
  },
  {
    value: "euclidean",
    label: "Euclidean Distance",
    description: "Direct distance measurement",
  },
  {
    value: "dot_product",
    label: "Dot Product",
    description: "Fast but requires normalized vectors",
  },
];

const PostgreSQLVectorStoreConfigModal = forwardRef<
  HTMLDialogElement,
  PostgreSQLVectorStoreConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { userCredentials } = useUserCredentialStore();
  const [selectedCredential, setSelectedCredential] = useState<string>("");

  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: PostgreSQLVectorStoreConfig = {
    connection_string: nodeData?.connection_string || "",
    collection_name: nodeData?.collection_name || "",
    pre_delete_collection: nodeData?.pre_delete_collection || false,
    fallback_embed_model:
      nodeData?.fallback_embed_model || "text-embedding-3-small",
    openai_api_key: nodeData?.openai_api_key || "",
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
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              PostgreSQL Vector Store
            </h3>
            <p className="text-slate-400 text-sm">
              Configure your vector DB and retrieval settings
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
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <label className="text-white font-semibold mb-2 block">
                  PostgreSQL Connection String
                </label>
                <Field
                  name="connection_string"
                  type="password"
                  placeholder="postgresql://user:pass@host:port/db"
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <div className="text-xs text-slate-400 mt-2">
                  Full connection string with credentials
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 space-y-4">
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    Collection Name
                  </label>
                  <Field
                    name="collection_name"
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="rag_collection_123"
                  />
                  <div className="text-xs text-slate-400 mt-2">
                    Vector collection name (auto-generated if empty)
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                  <div className="flex items-center space-x-3">
                    <Trash className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-white text-sm font-medium">
                        Pre-delete Collection
                      </div>
                      <div className="text-slate-400 text-xs">
                        Delete existing collection before storing new documents
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
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default PostgreSQLVectorStoreConfigModal;
