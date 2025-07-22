import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";

interface TavilySearchConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface TavilySearchConfig {
  tavily_api_key: string;
}

const TavilySearchConfigModal = forwardRef<
  HTMLDialogElement,
  TavilySearchConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const { userCredentials, fetchCredentials, isLoading } =
    useUserCredentialStore();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [loadingCredential, setLoadingCredential] = useState(false);

  const initialValues: TavilySearchConfig = {
    tavily_api_key: nodeData?.tavily_api_key || "",
  };

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Tavily Search {nodeId}</h3>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.tavily_api_key) {
              errors.tavily_api_key = "API key is required";
            }
            return errors;
          }}
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ values, setFieldValue, isSubmitting }) => (
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
                            "tavily_api_key",
                            result.secret.api_key
                          );
                        }
                      } finally {
                        setLoadingCredential(false);
                      }
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

              {/* API Key */}
              <div className="form-control">
                <label className="label">Tavily API Key</label>
                <Field
                  className="input input-bordered w-full"
                  type="password"
                  name="tavily_api_key"
                  placeholder="your-tavily-api-key"
                />
                <ErrorMessage
                  name="tavily_api_key"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>

              {/* Butonlar */}
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

export default TavilySearchConfigModal;
