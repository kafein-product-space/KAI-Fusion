import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
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

const PostgreSQLVectorStoreConfigModal = forwardRef<
  HTMLDialogElement,
  PostgreSQLVectorStoreConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
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

  // Handle credential selection
  useEffect(() => {
    if (selectedCredential && userCredentials) {
      const credential = userCredentials.find(
        (c: any) => c.id === selectedCredential
      );
      if (credential && credential.credential_type === "openai") {
        // Update the form with the selected credential
        // This would need to be handled through Formik's setFieldValue
      }
    }
  }, [selectedCredential, userCredentials]);

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

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-2">
          PostgreSQL Vector Store Ayarları
        </h3>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4 mt-4">
              {/* Database Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">PostgreSQL Connection String</label>
                  <Field
                    className="input input-bordered w-full"
                    name="connection_string"
                    placeholder="postgresql://user:pass@host:port/db"
                    type="password"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Full connection string with credentials
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">Collection Name</label>
                  <Field
                    className="input input-bordered w-full"
                    name="collection_name"
                    placeholder="rag_collection_123"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Vector collection name (auto-generated if empty)
                  </div>
                </div>
              </div>

              {/* Collection Management */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Pre-delete Collection</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="pre_delete_collection"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Delete existing collection before storing new documents
                </div>
              </div>

              {/* Embedding Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">Fallback Embedding Model</label>
                  <Field
                    as="select"
                    className="select select-bordered w-full"
                    name="fallback_embed_model"
                  >
                    {embeddingModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label} - {model.description}
                      </option>
                    ))}
                  </Field>
                  <div className="text-xs text-gray-500 mt-1">
                    Model for documents without embeddings
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">OpenAI API Key</label>
                  <Field
                    className="input input-bordered w-full"
                    name="openai_api_key"
                    placeholder="sk-..."
                    type="password"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    For fallback embedding generation
                  </div>
                </div>
              </div>

              {/* Search Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">Search Algorithm</label>
                  <Field
                    as="select"
                    className="select select-bordered w-full"
                    name="search_algorithm"
                  >
                    {searchAlgorithms.map((algo) => (
                      <option key={algo.value} value={algo.value}>
                        {algo.label}
                      </option>
                    ))}
                  </Field>
                  <div className="text-xs text-gray-500 mt-1">
                    Vector similarity search method
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">Search K: {values.search_k}</label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="search_k"
                    min="1"
                    max="50"
                    step="1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Number of documents to retrieve (1-50)
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    Score Threshold: {values.score_threshold.toFixed(2)}
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="score_threshold"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Minimum similarity score (0.0-1.0)
                  </div>
                </div>
              </div>

              {/* Performance Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    Batch Size: {values.batch_size}
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="batch_size"
                    min="10"
                    max="1000"
                    step="10"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Batch size for storing embeddings (10-1000)
                  </div>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span>Enable HNSW Index</span>
                    <Field
                      type="checkbox"
                      className="checkbox checkbox-primary ml-2"
                      name="enable_hnsw_index"
                    />
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    Create HNSW index for faster similarity search
                  </div>
                </div>
              </div>

              {/* Database Information */}
              <div className="alert alert-info">
                <div>
                  <h4 className="font-bold">
                    PostgreSQL + pgvector Requirements
                  </h4>
                  <div className="text-xs mt-1">
                    • PostgreSQL 11+ with pgvector extension •{" "}
                    <strong>CREATE EXTENSION vector;</strong> • Sufficient
                    storage for embeddings • Network access to database
                  </div>
                </div>
              </div>

              {/* Example Connection String */}
              <div className="form-control">
                <label className="label">Example Connection String</label>
                <div className="bg-gray-100 p-3 rounded-lg text-xs font-mono">
                  postgresql://username:password@localhost:5432/vectordb
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Standard PostgreSQL connection format
                </div>
              </div>

              {/* Performance Tips */}
              <div className="alert alert-warning">
                <div>
                  <h4 className="font-bold">Performance Tips</h4>
                  <div className="text-xs mt-1">
                    • Use HNSW index for large collections • Batch size affects
                    memory usage • Monitor connection pool • Consider read
                    replicas for high traffic
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
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
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default PostgreSQLVectorStoreConfigModal;
