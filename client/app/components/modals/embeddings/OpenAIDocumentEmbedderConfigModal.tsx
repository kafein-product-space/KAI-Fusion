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

interface OpenAIDocumentEmbedderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface OpenAIDocumentEmbedderConfig {
  embed_model: string;
  openai_api_key: string;
  batch_size: number;
  max_retries: number;
  request_timeout: number;
  include_metadata_in_embedding: boolean;
  normalize_vectors: boolean;
  enable_cost_estimation: boolean;
}

// Embedding Model Options
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

const OpenAIDocumentEmbedderConfigModal = forwardRef<
  HTMLDialogElement,
  OpenAIDocumentEmbedderConfigModalProps
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

  const initialValues: OpenAIDocumentEmbedderConfig = {
    embed_model: nodeData?.embed_model || "text-embedding-3-small",
    openai_api_key: nodeData?.openai_api_key || "",
    batch_size: nodeData?.batch_size || 100,
    max_retries: nodeData?.max_retries || 3,
    request_timeout: nodeData?.request_timeout || 60,
    include_metadata_in_embedding:
      nodeData?.include_metadata_in_embedding || false,
    normalize_vectors: nodeData?.normalize_vectors !== false,
    enable_cost_estimation: nodeData?.enable_cost_estimation !== false,
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-2">
          OpenAI Document Embedder Ayarları
        </h3>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.openai_api_key) {
              errors.openai_api_key = "OpenAI API key gereklidir.";
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
                        const result = await getUserCredentialSecret(credId);
                        if (result?.secret?.api_key) {
                          setFieldValue(
                            "openai_api_key",
                            result.secret.api_key
                          );
                        }
                      } finally {
                        setLoadingCredential(false);
                      }
                    } else {
                      setFieldValue("openai_api_key", "");
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

              {/* OpenAI API Key */}
              <div className="form-control">
                <label className="label">OpenAI API Key</label>
                <Field
                  className="input input-bordered w-full"
                  type="password"
                  name="openai_api_key"
                  placeholder="sk-..."
                  value={values.openai_api_key}
                />
                <ErrorMessage
                  name="openai_api_key"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>

              {/* Embedding Model Selection */}
              <div className="form-control">
                <label className="label">Embedding Model</label>
                <Field
                  as="select"
                  className="select select-bordered w-full"
                  name="embed_model"
                >
                  {EMBEDDING_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </Field>
                <div className="text-xs text-gray-500 mt-1">
                  {
                    EMBEDDING_MODELS.find((m) => m.value === values.embed_model)
                      ?.description
                  }
                </div>
              </div>

              {/* Batch Size */}
              <div className="form-control">
                <label className="label">Batch Size: {values.batch_size}</label>
                <Field
                  type="range"
                  className="range range-primary"
                  name="batch_size"
                  min="1"
                  max="500"
                  step="10"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Her batch'te işlenecek chunk sayısı
                </div>
              </div>

              {/* Max Retries */}
              <div className="form-control">
                <label className="label">
                  Max Retries: {values.max_retries}
                </label>
                <Field
                  type="range"
                  className="range range-primary"
                  name="max_retries"
                  min="0"
                  max="5"
                  step="1"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Başarısız istekler için maksimum yeniden deneme sayısı
                </div>
              </div>

              {/* Request Timeout */}
              <div className="form-control">
                <label className="label">
                  Request Timeout: {values.request_timeout}s
                </label>
                <Field
                  type="range"
                  className="range range-primary"
                  name="request_timeout"
                  min="10"
                  max="300"
                  step="10"
                />
                <div className="text-xs text-gray-500 mt-1">
                  API istekleri için timeout süresi (saniye)
                </div>
              </div>

              {/* Processing Options */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Metadata'yı Embedding'e Dahil Et</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="include_metadata_in_embedding"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Chunk metadata'sını embedding metnine dahil et
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Vektörleri Normalize Et</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="normalize_vectors"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Embedding vektörlerini birim uzunluğa normalize et
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Maliyet Tahmini</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="enable_cost_estimation"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Embedding maliyetini hesapla ve göster
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

export default OpenAIDocumentEmbedderConfigModal;
