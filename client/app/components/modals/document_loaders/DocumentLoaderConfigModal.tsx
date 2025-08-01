import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { FileText, Settings, Upload, FolderOpen, X } from "lucide-react";

interface DocumentLoaderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface DocumentLoaderConfig {
  file_paths: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const initialValues: DocumentLoaderConfig = {
    file_paths: nodeData?.file_paths || "",
    supported_formats: nodeData?.supported_formats || [
      "txt",
      "json",
      "docx",
      "pdf",
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
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">Document Loader</h3>
            <p className="text-slate-400 text-sm">
              Process local document files (TXT, JSON, DOCX, PDF)
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.file_paths && selectedFiles.length === 0) {
              errors.file_paths = "Please provide file paths or upload files.";
            }
            return errors;
          }}
          onSubmit={(values, { setSubmitting }) => {
            // Convert selected files to file paths for backend
            const filePaths = selectedFiles.map((file) => file.name).join("\n");
            const updatedValues = {
              ...values,
              file_paths: values.file_paths
                ? `${values.file_paths}\n${filePaths}`
                : filePaths,
              selected_files: selectedFiles, // Keep file objects for potential upload
            };
            onSave(updatedValues);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="space-y-6">
              {/* File Upload Section */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span>File Upload</span>
                </label>

                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                    isDragOver
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-600/50 hover:border-emerald-500/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.json,.docx,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center space-y-3 w-full"
                  >
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isDragOver
                          ? "bg-gradient-to-br from-emerald-400 to-green-500 scale-110"
                          : "bg-gradient-to-br from-emerald-500 to-green-600"
                      }`}
                    >
                      <FolderOpen
                        className={`w-8 h-8 text-white transition-all duration-200 ${
                          isDragOver ? "scale-110" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {isDragOver
                          ? "Dosyaları Buraya Bırak"
                          : "Dosya Seç veya Sürükle"}
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        TXT, JSON, DOCX, PDF dosyaları desteklenir
                      </p>
                    </div>
                  </button>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium text-sm">
                        Seçilen Dosyalar:
                      </h4>
                      <span className="text-slate-400 text-xs">
                        {selectedFiles.length} dosya seçildi
                      </span>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-600/50 hover:border-emerald-500/50 transition-colors duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {formatFileSize(file.size)} •{" "}
                                {formatDate(file.lastModified)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors duration-200 group"
                            title="Dosyayı kaldır"
                          >
                            <X className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="text-slate-400 text-xs text-center">
                      Toplam:{" "}
                      {formatFileSize(
                        selectedFiles.reduce((sum, file) => sum + file.size, 0)
                      )}
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
