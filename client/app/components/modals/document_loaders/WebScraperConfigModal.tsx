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
import { Globe, Key, Lock, Settings, Trash2 } from "lucide-react";

interface WebScraperConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface WebScraperConfig {
  urls: string;
  tavily_api_key: string;
  remove_selectors: string;
  min_content_length: number;
}

const WebScraperConfigModal = forwardRef<
  HTMLDialogElement,
  WebScraperConfigModalProps
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

  const initialValues: WebScraperConfig = {
    urls: nodeData?.urls || "",
    tavily_api_key: nodeData?.tavily_api_key || "",
    remove_selectors:
      nodeData?.remove_selectors ||
      "nav,footer,header,script,style,aside,noscript,form",
    min_content_length: nodeData?.min_content_length || 100,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-indigo-500/10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">Web Scraper</h3>
            <p className="text-slate-400 text-sm">
              Crawl pages and extract meaningful content
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.urls) {
              errors.urls = "Please enter at least one URL.";
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
            <Form className="space-y-6">
              {/* URLs */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-2">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <span>Target URLs</span>
                </label>
                <Field
                  as="textarea"
                  className="textarea textarea-bordered w-full h-28 bg-slate-900/80 text-white placeholder-slate-400 rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                  name="urls"
                  placeholder={`https://example.com\nhttps://example.org`}
                />
                <ErrorMessage
                  name="urls"
                  component="div"
                  className="text-red-400 text-sm mt-2"
                />
              </div>

              {/* Credential Section */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Key className="w-5 h-5 text-emerald-400" />
                  <span>API Credential</span>
                </label>

                <select
                  className="select w-full bg-slate-900/80 text-white border border-slate-600/50 rounded-lg mb-4"
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
                    } else {
                      setFieldValue("tavily_api_key", "");
                    }
                  }}
                  disabled={isLoading || loadingCredential}
                >
                  <option value="">Choose a credential...</option>
                  {userCredentials.map((cred) => (
                    <option key={cred.id} value={cred.id}>
                      {cred.name}
                    </option>
                  ))}
                </select>

                {loadingCredential && (
                  <div className="text-sm text-emerald-400">
                    Loading credential...
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Field
                    className="input w-full bg-slate-900/80 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    type="password"
                    name="tavily_api_key"
                    placeholder="your-tavily-api-key"
                  />
                </div>
              </div>

              {/* Other Settings */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-4">
                <label className="text-white font-semibold flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-orange-400" />
                  <span>Scraping Settings</span>
                </label>

                <div>
                  <label className="text-slate-300 text-sm mb-1 block">
                    Remove Selectors (comma-separated)
                  </label>
                  <Field
                    className="input input-bordered w-full bg-slate-900/80 border border-slate-600/50 text-white rounded-lg px-4 py-3"
                    name="remove_selectors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm mb-1 block">
                    Min Content Length
                  </label>
                  <Field
                    type="number"
                    min={0}
                    className="input input-bordered w-full bg-slate-900/80 border border-slate-600/50 text-white rounded-lg px-4 py-3"
                    name="min_content_length"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                    border border-slate-600 transition-all duration-200 hover:scale-105
                    flex items-center space-x-2"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 
                    hover:from-indigo-400 hover:to-blue-500 text-white rounded-lg 
                    shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105
                    flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default WebScraperConfigModal;
