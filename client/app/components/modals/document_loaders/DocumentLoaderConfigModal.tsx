import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  FileText,
  Settings,
  Upload,
  FolderOpen,
  X,
  Database,
  Key,
  Lock,
  Link,
} from "lucide-react";

interface DocumentLoaderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface DocumentLoaderConfig {
  drive_links: string;
  google_drive_auth_type: "service_account" | "oauth2";
  service_account_json: string;
  oauth2_client_id: string;
  oauth2_client_secret: string;
  oauth2_refresh_token: string;
  file_paths: string; // Legacy support
  supported_formats: string[];
  min_content_length: number;
  max_file_size_mb: number;
  storage_enabled: boolean;
  deduplicate: boolean;
  quality_threshold: number;
}

interface FileItem {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const DocumentLoaderConfigModal = forwardRef<
  HTMLDialogElement,
  DocumentLoaderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [authType, setAuthType] = useState(
    nodeData?.google_drive_auth_type || "service_account"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const initialValues: DocumentLoaderConfig = {
    drive_links: nodeData?.drive_links || "",
    google_drive_auth_type: authType,
    service_account_json: nodeData?.service_account_json || "",
    oauth2_client_id: nodeData?.oauth2_client_id || "",
    oauth2_client_secret: nodeData?.oauth2_client_secret || "",
    oauth2_refresh_token: nodeData?.oauth2_refresh_token || "",
    file_paths: nodeData?.file_paths || "",
    supported_formats: nodeData?.supported_formats || [
      "txt",
      "json",
      "docx",
      "pdf",
      "csv",
    ],
    min_content_length: nodeData?.min_content_length || 50,
    max_file_size_mb: nodeData?.max_file_size_mb || 50,
    storage_enabled: nodeData?.storage_enabled || false,
    deduplicate: nodeData?.deduplicate !== false,
    quality_threshold: nodeData?.quality_threshold || 0.5,
  };

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles: FileItem[] = [];

      Array.from(files).forEach((file) => {
        // Check file size (max 50MB default)
        const maxSize = initialValues.max_file_size_mb * 1024 * 1024;
        if (file.size > maxSize) {
          alert(
            `Dosya çok büyük: ${file.name} (${formatFileSize(
              file.size
            )}). Maksimum: ${initialValues.max_file_size_mb}MB`
          );
          return;
        }

        // Check file extension
        const extension = file.name.toLowerCase().split(".").pop();
        const supportedExtensions = ["txt", "json", "docx", "pdf"];
        if (!supportedExtensions.includes(extension || "")) {
          alert(
            `Desteklenmeyen dosya formatı: ${
              file.name
            }. Desteklenen formatlar: ${supportedExtensions.join(", ")}`
          );
          return;
        }

        validFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        });
      });

      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files) {
      const validFiles: FileItem[] = [];

      Array.from(files).forEach((file) => {
        // Check file size (max 50MB default)
        const maxSize = initialValues.max_file_size_mb * 1024 * 1024;
        if (file.size > maxSize) {
          alert(
            `Dosya çok büyük: ${file.name} (${formatFileSize(
              file.size
            )}). Maksimum: ${initialValues.max_file_size_mb}MB`
          );
          return;
        }

        // Check file extension
        const extension = file.name.toLowerCase().split(".").pop();
        const supportedExtensions = ["txt", "json", "docx", "pdf"];
        if (!supportedExtensions.includes(extension || "")) {
          alert(
            `Desteklenmeyen dosya formatı: ${
              file.name
            }. Desteklenen formatlar: ${supportedExtensions.join(", ")}`
          );
          return;
        }

        validFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        });
      });

      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const formatOptions = [
    {
      value: "txt",
      label: "Plain Text (.txt)",
      description: "Process plain text files",
    },
    {
      value: "json",
      label: "JSON (.json)",
      description: "Process JSON documents",
    },
    {
      value: "docx",
      label: "Word (.docx)",
      description: "Process Microsoft Word documents",
    },
    { value: "pdf", label: "PDF (.pdf)", description: "Process PDF documents" },
  ];

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-indigo-500/10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Google Drive Document Loader
            </h3>
            <p className="text-slate-400 text-sm">
              Process documents from Google Drive (TXT, JSON, DOCX, PDF, CSV)
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};

            // Google Drive links validation
            if (!values.drive_links || values.drive_links.trim() === "") {
              errors.drive_links = "Google Drive links are required";
            } else {
              const links = values.drive_links
                .trim()
                .split("\n")
                .filter((link) => link.trim());
              if (links.length === 0) {
                errors.drive_links =
                  "At least one valid Google Drive link is required";
              } else {
                // Validate Google Drive link format
                for (const link of links) {
                  const trimmedLink = link.trim();
                  if (
                    !trimmedLink.includes("drive.google.com") &&
                    !trimmedLink.includes("docs.google.com")
                  ) {
                    errors.drive_links = "Invalid Google Drive link format";
                    break;
                  }
                }
              }
            }

            // Authentication validation
            const authType = values.google_drive_auth_type || "service_account";

            if (authType === "service_account") {
              if (
                !values.service_account_json ||
                values.service_account_json.trim() === ""
              ) {
                errors.service_account_json =
                  "Service account JSON is required";
              } else {
                try {
                  JSON.parse(values.service_account_json);
                } catch (e) {
                  errors.service_account_json =
                    "Invalid JSON format for service account credentials";
                }
              }
            } else if (authType === "oauth2") {
              if (
                !values.oauth2_client_id ||
                values.oauth2_client_id.trim() === ""
              ) {
                errors.oauth2_client_id = "OAuth2 Client ID is required";
              }
              if (
                !values.oauth2_client_secret ||
                values.oauth2_client_secret.trim() === ""
              ) {
                errors.oauth2_client_secret =
                  "OAuth2 Client Secret is required";
              }
              if (
                !values.oauth2_refresh_token ||
                values.oauth2_refresh_token.trim() === ""
              ) {
                errors.oauth2_refresh_token =
                  "OAuth2 Refresh Token is required";
              }
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
              {/* Google Drive Configuration Section */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Database className="w-5 h-5 text-blue-400" />
                  <span>Google Drive Configuration</span>
                </label>

                {/* Google Drive Links */}
                <div className="mb-6">
                  <label className="text-white text-sm font-medium mb-2 block">
                    Google Drive Links
                  </label>
                  <Field
                    as="textarea"
                    name="drive_links"
                    placeholder="https://drive.google.com/file/d/...&#10;https://drive.google.com/drive/folders/..."
                    className="w-full p-3 text-sm bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-400 resize-none"
                    rows={4}
                  />
                  <ErrorMessage
                    name="drive_links"
                    component="div"
                    className="text-red-400 text-xs mt-1"
                  />
                </div>

                {/* Authentication Type */}
                <div className="mb-6">
                  <label className="text-white text-sm font-medium mb-2 block">
                    Authentication Method
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthType("service_account");
                        setFieldValue(
                          "google_drive_auth_type",
                          "service_account"
                        );
                      }}
                      className={`flex-1 p-3 text-sm rounded-lg border transition-colors ${
                        authType === "service_account"
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-slate-700/50 border-slate-600 text-gray-300 hover:border-slate-500"
                      }`}
                    >
                      <Key className="w-4 h-4 inline mr-2" />
                      Service Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthType("oauth2");
                        setFieldValue("google_drive_auth_type", "oauth2");
                      }}
                      className={`flex-1 p-3 text-sm rounded-lg border transition-colors ${
                        authType === "oauth2"
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-slate-700/50 border-slate-600 text-gray-300 hover:border-slate-500"
                      }`}
                    >
                      <Lock className="w-4 h-4 inline mr-2" />
                      OAuth2
                    </button>
                  </div>
                </div>

                {/* Service Account Configuration */}
                {authType === "service_account" && (
                  <div className="mb-6">
                    <label className="text-white text-sm font-medium mb-2 block">
                      Service Account JSON
                    </label>
                    <Field
                      as="textarea"
                      name="service_account_json"
                      placeholder='{"type": "service_account", "project_id": "...", ...}'
                      className="w-full p-3 text-sm bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-400 resize-none font-mono"
                      rows={8}
                    />
                    <ErrorMessage
                      name="service_account_json"
                      component="div"
                      className="text-red-400 text-xs mt-1"
                    />
                  </div>
                )}

                {/* OAuth2 Configuration */}
                {authType === "oauth2" && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Client ID
                      </label>
                      <Field
                        type="password"
                        name="oauth2_client_id"
                        placeholder="Your Google OAuth2 Client ID"
                        className="w-full p-3 text-sm bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-400"
                      />
                      <ErrorMessage
                        name="oauth2_client_id"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Client Secret
                      </label>
                      <Field
                        type="password"
                        name="oauth2_client_secret"
                        placeholder="Your Google OAuth2 Client Secret"
                        className="w-full p-3 text-sm bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-400"
                      />
                      <ErrorMessage
                        name="oauth2_client_secret"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Refresh Token
                      </label>
                      <Field
                        type="password"
                        name="oauth2_refresh_token"
                        placeholder="Your Google OAuth2 Refresh Token"
                        className="w-full p-3 text-sm bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-400"
                      />
                      <ErrorMessage
                        name="oauth2_refresh_token"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Supported Formats */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>Supported Formats</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {formatOptions.map((format) => (
                    <label
                      key={format.value}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={values.supported_formats.includes(
                          format.value
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFieldValue("supported_formats", [
                              ...values.supported_formats,
                              format.value,
                            ]);
                          } else {
                            setFieldValue(
                              "supported_formats",
                              values.supported_formats.filter(
                                (f) => f !== format.value
                              )
                            );
                          }
                        }}
                      />
                      <div>
                        <div className="text-white text-sm font-medium">
                          {format.label}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {format.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Processing Settings */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-4">
                <label className="text-white font-semibold flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-orange-400" />
                  <span>Processing Settings</span>
                </label>

                <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <label className="text-slate-300 text-sm mb-1 block">
                      Max File Size (MB)
                    </label>
                    <Field
                      type="number"
                      min={1}
                      max={100}
                      className="input input-bordered w-full bg-slate-900/80 border border-slate-600/50 text-white rounded-lg px-4 py-3"
                      name="max_file_size_mb"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 text-sm mb-1 block">
                    Quality Threshold
                  </label>
                  <Field
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    className="range range-primary w-full"
                    name="quality_threshold"
                  />
                  <div className="text-slate-400 text-xs mt-1">
                    Current: {values.quality_threshold}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={values.storage_enabled}
                      onChange={(e) =>
                        setFieldValue("storage_enabled", e.target.checked)
                      }
                    />
                    <span className="text-white text-sm">
                      Enable Document Storage
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={values.deduplicate}
                      onChange={(e) =>
                        setFieldValue("deduplicate", e.target.checked)
                      }
                    />
                    <span className="text-white text-sm">
                      Remove Duplicates
                    </span>
                  </label>
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
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 
                    hover:from-emerald-400 hover:to-green-500 text-white rounded-lg 
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

export default DocumentLoaderConfigModal;
