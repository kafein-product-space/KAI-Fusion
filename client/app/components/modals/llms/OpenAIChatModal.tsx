import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { useSnackbar } from "notistack";
import { useUserCredentialStore } from "~/stores/userCredential";
import type { UserCredential } from "~/types/api";
import { getUserCredentialSecret } from "~/services/userCredentialService";

interface OpenAIChatConfig {
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  credential_name?: string;
  api_key?: string;
}

interface OpenAIChatNodeModalProps {
  nodeData: any;
  onSave: (data: OpenAIChatConfig) => void;
  nodeId: string;
}

const OpenAIChatNodeModal = forwardRef<
  HTMLDialogElement,
  OpenAIChatNodeModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);
  const { enqueueSnackbar } = useSnackbar();

  const { userCredentials, fetchCredentials, isLoading } =
    useUserCredentialStore();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [apiKeyOverride, setApiKeyOverride] = useState<string>("");
  const [loadingCredential, setLoadingCredential] = useState(false);

  const formikRef = useRef<any>(null);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  useEffect(() => {
    if (selectedCredentialId) {
      setLoadingCredential(true);
      getUserCredentialSecret(selectedCredentialId)
        .then((cred) => {
          console.log("[LLM Modal] getUserCredentialSecret result:", cred);
          if (cred?.secret?.api_key) {
            setApiKeyOverride(cred.secret.api_key);
            if (formikRef.current) {
              formikRef.current.setFieldValue("api_key", cred.secret.api_key);
            }
          } else {
            setApiKeyOverride("");
            if (formikRef.current) {
              formikRef.current.setFieldValue("api_key", "");
            }
          }

          if (cred?.name && formikRef.current) {
            formikRef.current.setFieldValue("credential_name", cred.name);
          }
        })
        .finally(() => setLoadingCredential(false));
    } else {
      setApiKeyOverride("");
      if (formikRef.current) {
        formikRef.current.setFieldValue("credential_name", "");
        formikRef.current.setFieldValue("api_key", "");
      }
    }
  }, [selectedCredentialId]);

  const selectedCredential = userCredentials.find(
    (cred) => cred.id === selectedCredentialId
  );

  const initialValues: OpenAIChatConfig = {
    model_name: nodeData?.model_name || "gpt-3.5-turbo",
    temperature: nodeData?.temperature ?? 0.7,
    max_tokens: nodeData?.max_tokens ?? 500,
    credential_name:
      selectedCredential?.name || nodeData?.credential_name || "",
    api_key: selectedCredentialId ? apiKeyOverride : nodeData?.api_key || "",
  };

  const validate = (values: OpenAIChatConfig) => {
    const errors: Record<string, string> = {};
    if (!values.api_key) errors.api_key = "API Key is required";
    if (!values.credential_name)
      errors.credential_name = "Credential name is required";
    if (!values.model_name) errors.model_name = "Model is required";
    if (
      values.temperature !== undefined &&
      (values.temperature < 0 || values.temperature > 2)
    ) {
      errors.temperature = "Temperature must be between 0 and 2";
    }
    if (
      values.max_tokens !== undefined &&
      (values.max_tokens < 1 || values.max_tokens > 32000)
    ) {
      errors.max_tokens = "Max tokens must be between 1 and 32000";
    }
    return errors;
  };

  const handleSubmit = async (
    values: OpenAIChatConfig,
    { setSubmitting }: any
  ) => {
    try {
      onSave(values);
      dialogRef.current?.close();
      enqueueSnackbar("Ayarlar kaydedildi", { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error?.message || "Ayarlar kaydedilemedi.", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">OpenAI Chat Ayarları</h3>
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validate={validate}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="flex flex-col gap-4">
              {/* Model */}
              <div className="form-control">
                <label className="label">Model</label>
                <Field
                  as="select"
                  name="model_name"
                  className="select select-bordered w-full"
                >
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  <option value="gpt-4">gpt-4</option>
                  <option value="gpt-4o">gpt-4o</option>
                </Field>
                <ErrorMessage
                  name="model_name"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>

              {/* Temperature */}
              <div className="form-control">
                <label className="label">Temperature (0 - 2)</label>
                <Field
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  name="temperature"
                  className="input input-bordered w-full"
                />
                <ErrorMessage
                  name="temperature"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>

              {/* Max Tokens */}
              <div className="form-control">
                <label className="label">Max Tokens</label>
                <Field
                  type="number"
                  name="max_tokens"
                  className="input input-bordered w-full"
                />
                <ErrorMessage
                  name="max_tokens"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>

              {/* Credential Selector */}
              <div className="form-control">
                <label className="label">Credential Seç</label>
                <select
                  className="select select-bordered w-full"
                  value={selectedCredentialId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSelectedCredentialId(e.target.value);
                  }}
                  disabled={
                    isLoading ||
                    userCredentials.length === 0 ||
                    loadingCredential
                  }
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

              {/* Credential Name */}
              <div className="form-control">
                <label className="label">Credential Name</label>
                <Field
                  type="text"
                  name="credential_name"
                  className="input input-bordered w-full"
                  value={values.credential_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFieldValue("credential_name", e.target.value);
                  }}
                  readOnly={!!selectedCredentialId}
                  disabled={loadingCredential}
                />
                <ErrorMessage
                  name="credential_name"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>

              {/* API Key */}
              <div className="form-control">
                <label className="label">API Key</label>
                <Field
                  type="password"
                  name="api_key"
                  className="input input-bordered w-full"
                  value={values.api_key}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setApiKeyOverride(e.target.value);
                    setFieldValue("api_key", e.target.value);
                  }}
                  disabled={loadingCredential}
                />
                <ErrorMessage
                  name="api_key"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="modal-action flex gap-2">
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default OpenAIChatNodeModal;
