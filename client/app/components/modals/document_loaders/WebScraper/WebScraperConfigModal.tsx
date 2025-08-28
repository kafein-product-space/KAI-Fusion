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
import type { WebScraperConfig } from "../../../nodes/document_loaders/WebScraper/types";

interface WebScraperConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
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
    user_agent: nodeData?.user_agent || "Default KAI-Fusion",
    max_concurrent: nodeData?.max_concurrent || 5,
    timeout_seconds: nodeData?.timeout_seconds || 30,
    retry_attempts: nodeData?.retry_attempts || 3,
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
                  className="text-red-400 text-sm mt-1"
                />
              </div>

              {/* User Agent */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <span>User Agent</span>
                </label>
                <Field
                  type="text"
                  className="input input-bordered w-full bg-slate-900/80 text-white placeholder-slate-400 rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                  name="user_agent"
                  placeholder="Default KAI-Fusion"
                />
              </div>

              {/* Remove Selectors */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-2">
                  <Trash2 className="w-5 h-5 text-indigo-400" />
                  <span>Remove Selectors</span>
                </label>
                <Field
                  as="textarea"
                  className="textarea textarea-bordered w-full h-20 bg-slate-900/80 text-white placeholder-slate-400 rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                  name="remove_selectors"
                  placeholder="nav,footer,header,script,style,aside,noscript,form"
                />
                <p className="text-slate-400 text-xs mt-1">
                  CSS selectors to remove from scraped content
                </p>
              </div>

              {/* Advanced Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                  <label className="text-white font-semibold mb-2 block">
                    Min Content Length
                  </label>
                  <Field
                    type="number"
                    className="input input-bordered w-full bg-slate-900/80 text-white rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                    name="min_content_length"
                    min="1"
                  />
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                  <label className="text-white font-semibold mb-2 block">
                    Max Concurrent
                  </label>
                  <Field
                    type="number"
                    className="input input-bordered w-full bg-slate-900/80 text-white rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                    name="max_concurrent"
                    min="1"
                    max="10"
                  />
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                  <label className="text-white font-semibold mb-2 block">
                    Timeout (seconds)
                  </label>
                  <Field
                    type="number"
                    className="input input-bordered w-full bg-slate-900/80 text-white rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                    name="timeout_seconds"
                    min="5"
                    max="300"
                  />
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                  <label className="text-white font-semibold mb-2 block">
                    Retry Attempts
                  </label>
                  <Field
                    type="number"
                    className="input input-bordered w-full bg-slate-900/80 text-white rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                    name="retry_attempts"
                    min="0"
                    max="5"
                  />
                </div>
              </div>

              {/* Tavily API Key */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  <span>Tavily API Key (Optional)</span>
                </label>
                <Field
                  type="password"
                  className="input input-bordered w-full bg-slate-900/80 text-white placeholder-slate-400 rounded-lg px-4 py-3 border border-slate-600/50 focus:ring-2 focus:ring-indigo-500/20"
                  name="tavily_api_key"
                  placeholder="Enter your Tavily API key"
                />
                <p className="text-slate-400 text-xs mt-1">
                  Used for enhanced web search capabilities
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  className="btn btn-ghost text-slate-400 hover:text-white"
                  onClick={() => dialogRef.current?.close()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white border-0"
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

export default WebScraperConfigModal; 