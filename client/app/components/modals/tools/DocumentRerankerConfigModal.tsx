import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";

interface DocumentRerankerConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface DocumentRerankerConfig {
  rerank_strategy: string;
  cohere_api_key: string;
  initial_k: number;
  final_k: number;
  hybrid_alpha: number;
  enable_caching: boolean;
  similarity_threshold: number;
}

// Reranking Strategy Options
const RERANKING_STRATEGIES = [
  {
    value: "cohere",
    label: "Cohere Rerank ⭐",
    description:
      "State-of-the-art neural reranking with Cohere API • Cost: $0.002/1K requests",
  },
  {
    value: "bm25",
    label: "BM25 Statistical",
    description: "Classical BM25 statistical ranking (free, fast)",
  },
  {
    value: "hybrid",
    label: "Hybrid (Vector + BM25) ⭐",
    description:
      "Combines vector similarity with BM25 statistical ranking (free)",
  },
  {
    value: "no_rerank",
    label: "No Reranking",
    description: "Pass-through mode (original retriever order)",
  },
];

const DocumentRerankerConfigModal = forwardRef<
  HTMLDialogElement,
  DocumentRerankerConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const { userCredentials, fetchCredentials, isLoading } =
    useUserCredentialStore();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [loadingCredential, setLoadingCredential] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const initialValues: DocumentRerankerConfig = {
    rerank_strategy: nodeData?.rerank_strategy || "hybrid",
    cohere_api_key: nodeData?.cohere_api_key || "",
    initial_k: nodeData?.initial_k || 20,
    final_k: nodeData?.final_k || 6,
    hybrid_alpha: nodeData?.hybrid_alpha || 0.7,
    enable_caching: nodeData?.enable_caching !== false,
    similarity_threshold: nodeData?.similarity_threshold || 0.0,
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-2">Document Reranker Ayarları</h3>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (values.rerank_strategy === "cohere" && !values.cohere_api_key) {
              errors.cohere_api_key = "Cohere API key gereklidir.";
            }
            return errors;
          }}
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="space-y-4 mt-4">
              {/* Reranking Strategy */}
              <div className="form-control">
                <label className="label">Reranking Strategy</label>
                <Field
                  as="select"
                  className="select select-bordered w-full"
                  name="rerank_strategy"
                >
                  {RERANKING_STRATEGIES.map((strategy) => (
                    <option key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </option>
                  ))}
                </Field>
                <div className="text-xs text-gray-500 mt-1">
                  {
                    RERANKING_STRATEGIES.find(
                      (s) => s.value === values.rerank_strategy
                    )?.description
                  }
                </div>
              </div>

              {/* Cohere API Key (only for Cohere strategy) */}
              {values.rerank_strategy === "cohere" && (
                <>
                  {/* Credential Seçici */}
                  <div className="form-control">
                    <label className="label">Credential Seç (Opsiyonel)</label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedCredentialId}
                      onChange={async (e) => {
                        const credId = e.target.value;
                        setSelectedCredentialId(credId);
                        if (credId) {
                          setLoadingCredential(true);
                          try {
                            const result = await getUserCredentialSecret(
                              credId
                            );
                            if (result?.secret?.api_key) {
                              setFieldValue(
                                "cohere_api_key",
                                result.secret.api_key
                              );
                            }
                          } finally {
                            setLoadingCredential(false);
                          }
                        } else {
                          setFieldValue("cohere_api_key", "");
                        }
                      }}
                      disabled={isLoading || loadingCredential}
                    >
                      <option value="">Bir credential seçin...</option>
                      {userCredentials.map((cred) => (
                        <option key={cred.id} value={cred.id}>
                          {cred.name}
                        </option>
                      ))}
                    </select>
                    {loadingCredential && (
                      <span className="text-xs text-gray-500">
                        Credential yükleniyor...
                      </span>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label">Cohere API Key</label>
                    <Field
                      className="input input-bordered w-full"
                      type="password"
                      name="cohere_api_key"
                      placeholder="your-cohere-api-key"
                      value={values.cohere_api_key}
                    />
                    <ErrorMessage
                      name="cohere_api_key"
                      component="div"
                      className="text-red-500 text-xs"
                    />
                  </div>
                </>
              )}

              {/* Retrieval Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">Initial K: {values.initial_k}</label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="initial_k"
                    min="5"
                    max="100"
                    step="5"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Base retriever'dan alınacak doküman sayısı
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">Final K: {values.final_k}</label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="final_k"
                    min="1"
                    max="20"
                    step="1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Reranking sonrası döndürülecek doküman sayısı
                  </div>
                </div>
              </div>

              {/* Hybrid Alpha (only for hybrid strategy) */}
              {values.rerank_strategy === "hybrid" && (
                <div className="form-control">
                  <label className="label">
                    Hybrid Alpha: {values.hybrid_alpha}
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="hybrid_alpha"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    0.0 = BM25 only, 1.0 = vector only, 0.7 = balanced
                  </div>
                </div>
              )}

              {/* Advanced Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    Similarity Threshold: {values.similarity_threshold}
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="similarity_threshold"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Minimum similarity threshold for documents
                  </div>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span>Enable Caching</span>
                    <Field
                      type="checkbox"
                      className="checkbox checkbox-primary ml-2"
                      name="enable_caching"
                    />
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    Cache reranking results for repeated queries
                  </div>
                </div>
              </div>

              {/* Strategy Information */}
              <div className="alert alert-info">
                <div>
                  <h4 className="font-bold">Strategy Information</h4>
                  <div className="text-xs mt-1">
                    <strong>Cohere:</strong> Best quality, paid API •{" "}
                    <strong>BM25:</strong> Fast, free • <strong>Hybrid:</strong>{" "}
                    Balanced, free • <strong>No Rerank:</strong> Baseline
                    comparison
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

export default DocumentRerankerConfigModal;
