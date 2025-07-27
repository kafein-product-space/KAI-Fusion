import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";

interface HTTPClientConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface HTTPClientConfig {
  method: string;
  url: string;
  headers: string;
  url_params: string;
  body: string;
  content_type: string;
  auth_type: string;
  auth_token: string;
  auth_username: string;
  auth_password: string;
  api_key_header: string;
  timeout: number;
  max_retries: number;
  retry_delay: number;
  follow_redirects: boolean;
  verify_ssl: boolean;
  enable_templating: boolean;
}

// HTTP Method Options
const HTTP_METHODS = [
  { value: "GET", label: "GET", description: "Retrieve data from server" },
  { value: "POST", label: "POST", description: "Send data to server" },
  { value: "PUT", label: "PUT", description: "Update resource on server" },
  { value: "PATCH", label: "PATCH", description: "Partially update resource" },
  {
    value: "DELETE",
    label: "DELETE",
    description: "Delete resource from server",
  },
  { value: "HEAD", label: "HEAD", description: "Get response headers only" },
  { value: "OPTIONS", label: "OPTIONS", description: "Get allowed methods" },
];

// Content Type Options
const CONTENT_TYPES = [
  { value: "json", label: "JSON", description: "application/json" },
  {
    value: "form",
    label: "Form Data",
    description: "application/x-www-form-urlencoded",
  },
  { value: "xml", label: "XML", description: "application/xml" },
  { value: "text", label: "Plain Text", description: "text/plain" },
  { value: "html", label: "HTML", description: "text/html" },
];

// Authentication Type Options
const AUTH_TYPES = [
  {
    value: "none",
    label: "No Authentication",
    description: "No authentication required",
  },
  {
    value: "bearer",
    label: "Bearer Token",
    description: "Authorization: Bearer <token>",
  },
  {
    value: "basic",
    label: "Basic Auth",
    description: "HTTP Basic Authentication",
  },
  {
    value: "api_key",
    label: "API Key Header",
    description: "Custom API key header",
  },
];

const HTTPClientConfigModal = forwardRef<
  HTMLDialogElement,
  HTTPClientConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: HTTPClientConfig = {
    method: nodeData?.method || "GET",
    url: nodeData?.url || "",
    headers: nodeData?.headers || "{}",
    url_params: nodeData?.url_params || "{}",
    body: nodeData?.body || "",
    content_type: nodeData?.content_type || "json",
    auth_type: nodeData?.auth_type || "none",
    auth_token: nodeData?.auth_token || "",
    auth_username: nodeData?.auth_username || "",
    auth_password: nodeData?.auth_password || "",
    api_key_header: nodeData?.api_key_header || "X-API-Key",
    timeout: nodeData?.timeout || 30,
    max_retries: nodeData?.max_retries || 3,
    retry_delay: nodeData?.retry_delay || 1.0,
    follow_redirects: nodeData?.follow_redirects !== false,
    verify_ssl: nodeData?.verify_ssl !== false,
    enable_templating: nodeData?.enable_templating !== false,
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg mb-2">HTTP Client Ayarları</h3>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.url) {
              errors.url = "URL gereklidir.";
            }
            return errors;
          }}
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values }) => (
            <Form className="space-y-4 mt-4">
              {/* Basic Request Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* HTTP Method */}
                <div className="form-control">
                  <label className="label">HTTP Method</label>
                  <Field
                    as="select"
                    className="select select-bordered w-full"
                    name="method"
                  >
                    {HTTP_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </Field>
                  <div className="text-xs text-gray-500 mt-1">
                    {
                      HTTP_METHODS.find((m) => m.value === values.method)
                        ?.description
                    }
                  </div>
                </div>

                {/* URL */}
                <div className="form-control">
                  <label className="label">URL</label>
                  <Field
                    className="input input-bordered w-full"
                    name="url"
                    placeholder="https://api.example.com/endpoint"
                  />
                  <ErrorMessage
                    name="url"
                    component="div"
                    className="text-red-500 text-xs"
                  />
                </div>
              </div>

              {/* Headers and Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">Headers (JSON)</label>
                  <Field
                    as="textarea"
                    className="textarea textarea-bordered w-full h-20"
                    name="headers"
                    placeholder='{"Content-Type": "application/json"}'
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Request headers as JSON object
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">URL Parameters (JSON)</label>
                  <Field
                    as="textarea"
                    className="textarea textarea-bordered w-full h-20"
                    name="url_params"
                    placeholder='{"param1": "value1"}'
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Query parameters as JSON object
                  </div>
                </div>
              </div>

              {/* Request Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">Request Body</label>
                  <Field
                    as="textarea"
                    className="textarea textarea-bordered w-full h-24"
                    name="body"
                    placeholder='{"key": "value"}'
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Request body (supports Jinja2 templating)
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">Content Type</label>
                  <Field
                    as="select"
                    className="select select-bordered w-full"
                    name="content_type"
                  >
                    {CONTENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Field>
                  <div className="text-xs text-gray-500 mt-1">
                    {
                      CONTENT_TYPES.find((t) => t.value === values.content_type)
                        ?.description
                    }
                  </div>
                </div>
              </div>

              {/* Authentication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">Authentication Type</label>
                  <Field
                    as="select"
                    className="select select-bordered w-full"
                    name="auth_type"
                  >
                    {AUTH_TYPES.map((auth) => (
                      <option key={auth.value} value={auth.value}>
                        {auth.label}
                      </option>
                    ))}
                  </Field>
                  <div className="text-xs text-gray-500 mt-1">
                    {
                      AUTH_TYPES.find((a) => a.value === values.auth_type)
                        ?.description
                    }
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">Auth Token/API Key</label>
                  <Field
                    className="input input-bordered w-full"
                    type="password"
                    name="auth_token"
                    placeholder="your-token-or-api-key"
                  />
                </div>
              </div>

              {/* Basic Auth Fields */}
              {values.auth_type === "basic" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">Username</label>
                    <Field
                      className="input input-bordered w-full"
                      name="auth_username"
                      placeholder="username"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">Password</label>
                    <Field
                      className="input input-bordered w-full"
                      type="password"
                      name="auth_password"
                      placeholder="password"
                    />
                  </div>
                </div>
              )}

              {/* API Key Header */}
              {values.auth_type === "api_key" && (
                <div className="form-control">
                  <label className="label">API Key Header Name</label>
                  <Field
                    className="input input-bordered w-full"
                    name="api_key_header"
                    placeholder="X-API-Key"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Header name for API key (e.g., 'X-API-Key')
                  </div>
                </div>
              )}

              {/* Advanced Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">Timeout: {values.timeout}s</label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="timeout"
                    min="1"
                    max="300"
                    step="1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Request timeout in seconds
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    Max Retries: {values.max_retries}
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="max_retries"
                    min="0"
                    max="10"
                    step="1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Maximum retry attempts
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    Retry Delay: {values.retry_delay}s
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="retry_delay"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Delay between retries
                  </div>
                </div>
              </div>

              {/* Processing Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span>Follow Redirects</span>
                    <Field
                      type="checkbox"
                      className="checkbox checkbox-primary ml-2"
                      name="follow_redirects"
                    />
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    Follow HTTP redirects automatically
                  </div>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span>Verify SSL</span>
                    <Field
                      type="checkbox"
                      className="checkbox checkbox-primary ml-2"
                      name="verify_ssl"
                    />
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    Verify SSL certificates
                  </div>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span>Enable Templating</span>
                    <Field
                      type="checkbox"
                      className="checkbox checkbox-primary ml-2"
                      name="enable_templating"
                    />
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    Enable Jinja2 templating for URL and body
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

export default HTTPClientConfigModal;
