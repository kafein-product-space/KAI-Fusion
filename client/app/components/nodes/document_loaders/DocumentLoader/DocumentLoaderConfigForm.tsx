// DocumentLoaderConfigForm.tsx
import React, { useRef, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { useSnackbar } from "notistack";
import { Settings, Database, Key, Lock } from "lucide-react";

// Standard props interface matching other config forms
interface DocumentLoaderConfigFormProps {
  configData?: any;
  onSave?: (values: any) => void;
  onCancel: () => void;
  initialValues?: any;
  validate?: (values: any) => any;
  onSubmit?: (values: any) => void;
}

interface FileItem {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export default function DocumentLoaderConfigForm({
  configData,
  onSave,
  onCancel,
  initialValues: propInitialValues,
  validate: propValidate,
  onSubmit: propOnSubmit,
}: DocumentLoaderConfigFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  
  // Default values for missing fields
  const initialValues = propInitialValues || {
    drive_links: configData?.drive_links || "",
    google_drive_auth_type: configData?.google_drive_auth_type || "service_account",
    service_account_json: configData?.service_account_json || "",
    oauth2_client_id: configData?.oauth2_client_id || "",
    oauth2_client_secret: configData?.oauth2_client_secret || "",
    supported_formats: configData?.supported_formats || ["txt", "json", "docx", "pdf"],
    min_content_length: configData?.min_content_length || 100,
    max_file_size_mb: configData?.max_file_size_mb || 100,
    quality_threshold: configData?.quality_threshold || 0.5,
    storage_enabled: configData?.storage_enabled ?? true,
    deduplicate: configData?.deduplicate ?? true,
  };
  
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [authType, setAuthType] = useState(
    initialValues.google_drive_auth_type || "service_account"
  );
  
  // Validation function
  const validate = propValidate || ((values: any) => {
    const errors: any = {};
    if (!values.drive_links) {
      errors.drive_links = "At least one Google Drive link is required";
    }
    if (values.min_content_length < 1) {
      errors.min_content_length = "Min content length must be at least 1";
    }
    if (values.max_file_size_mb < 1 || values.max_file_size_mb > 1000) {
      errors.max_file_size_mb = "Max file size must be between 1 and 1000 MB";
    }
    if (authType === "service_account" && !values.service_account_json) {
      errors.service_account_json = "Service account JSON is required";
    }
    if (authType === "oauth2") {
      if (!values.oauth2_client_id) {
        errors.oauth2_client_id = "Client ID is required for OAuth2";
      }
      if (!values.oauth2_client_secret) {
        errors.oauth2_client_secret = "Client Secret is required for OAuth2";
      }
    }
    return errors;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles: FileItem[] = [];

      Array.from(files).forEach((file) => {
        // Check file size (max 100MB default)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(
            `Dosya çok büyük: ${file.name} (${formatFileSize(
              file.size
            )}). Maksimum: 100MB`
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const files = e.dataTransfer.files;
    if (files) {
      const validFiles: FileItem[] = [];

      Array.from(files).forEach((file) => {
        // Check file size (max 100MB default)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(
            `Dosya çok büyük: ${file.name} (${formatFileSize(
              file.size
            )}). Maksimum: 100MB`
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

  // Use the provided onSubmit or fallback to onSave
  const handleSubmit = propOnSubmit || onSave;

  const handleSaveConfig = async (values: any) => {
    try {
      // Show loading message
      enqueueSnackbar(
        "Google Drive Document Loader konfigürasyonu kaydediliyor...",
        {
          variant: "info",
        }
      );

      // Call the provided submit handler
      if (handleSubmit) {
        await handleSubmit(values);
      }

      // Show success message
      enqueueSnackbar("Google Drive Document Loader başarıyla kaydedildi! 🎉", {
        variant: "success",
      });
    } catch (error) {
      // Show error message
      enqueueSnackbar("Konfigürasyon kaydedilirken hata oluştu!", {
        variant: "error",
      });
      console.error("DocumentLoader config save error:", error);
    }
  };

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={handleSaveConfig}
        enableReinitialize={true}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-6 w-full p-6">
            {/* Google Drive Links */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Google Drive Links
              </label>
              <Field
                as="textarea"
                name="drive_links"
                placeholder="https://drive.google.com/file/d/...&#10;https://drive.google.com/drive/folders/..."
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                rows={4}
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="text-sm text-gray-400 mt-2">
                Enter Google Drive file or folder URLs (one per line)
              </div>
              <ErrorMessage
                name="drive_links"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Authentication Type */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Authentication Method
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthType("service_account");
                    setFieldValue("google_drive_auth_type", "service_account");
                  }}
                  className={`flex-1 p-3 text-sm rounded-lg border transition-colors ${
                    authType === "service_account"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-900/80 border-gray-600 text-gray-300 hover:border-gray-500"
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
                      : "bg-slate-900/80 border-gray-600 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  OAuth2
                </button>
              </div>
            </div>

            {/* Service Account Configuration */}
            {authType === "service_account" && (
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Service Account JSON
                </label>
                <Field
                  as="textarea"
                  name="service_account_json"
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                  className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                  rows={6}
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
              <div className="space-y-2">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Client ID
                  </label>
                  <Field
                    type="password"
                    name="oauth2_client_id"
                    placeholder="Your Google OAuth2 Client ID"
                    className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    onMouseDown={(e: any) => e.stopPropagation()}
                    onTouchStart={(e: any) => e.stopPropagation()}
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
                    className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    onMouseDown={(e: any) => e.stopPropagation()}
                    onTouchStart={(e: any) => e.stopPropagation()}
                  />
                  <ErrorMessage
                    name="oauth2_client_secret"
                    component="div"
                    className="text-red-400 text-xs mt-1"
                  />
                </div>
              </div>
            )}

            {/* Supported Formats */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Supported Formats
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "txt",
                    label: "Text Files",
                    description: ".txt, .md, .log",
                  },
                  {
                    value: "json",
                    label: "JSON",
                    description: ".json, .jsonl",
                  },
                  {
                    value: "docx",
                    label: "Word Docs",
                    description: ".docx, .doc",
                  },
                  { value: "pdf", label: "PDF", description: ".pdf" },
                  { value: "csv", label: "CSV", description: ".csv" },
                ].map((format) => (
                  <label
                    key={format.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Field
                      type="checkbox"
                      name="supported_formats"
                      value={format.value}
                      className="w-3 h-3 text-blue-600 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <div className="text-white text-xs">
                      <div className="font-medium">{format.label}</div>
                      <div className="text-gray-400">{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              <ErrorMessage
                name="supported_formats"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Processing Options */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Min Content Length
                </label>
                <Field
                  type="number"
                  name="min_content_length"
                  className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <ErrorMessage
                  name="min_content_length"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Max File Size (MB)
                </label>
                <Field
                  type="number"
                  name="max_file_size_mb"
                  className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <ErrorMessage
                  name="max_file_size_mb"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>
            </div>

            {/* Quality Settings */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Quality Threshold: {values.quality_threshold || 0.5}
              </label>
              <Field
                type="range"
                name="quality_threshold"
                min="0"
                max="1"
                step="0.1"
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <ErrorMessage
                name="quality_threshold"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Processing Options */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <Field
                  type="checkbox"
                  name="storage_enabled"
                  className="w-3 h-3 text-blue-600 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-white text-xs">
                  Enable Document Storage
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <Field
                  type="checkbox"
                  name="deduplicate"
                  className="w-3 h-3 text-blue-600 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-white text-xs">Remove Duplicates</span>
              </label>
            </div>

          </Form>
        )}
      </Formik>
    </div>
  );
}
