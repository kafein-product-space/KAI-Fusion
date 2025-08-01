// DocumentLoaderConfigForm.tsx
import React, { useRef, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Settings, FileText, Upload, X, File } from "lucide-react";
import type { DocumentLoaderConfigFormProps } from "./types";

interface FileItem {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export default function DocumentLoaderConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: DocumentLoaderConfigFormProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
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

  return (
    <div className="relative p-2 w-64 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            Document Loader
          </span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form className="space-y-3 w-full p-3">
            {/* File Upload */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Upload Files
              </label>

              {/* Drag & Drop Area */}
              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:border-gray-500 transition-colors"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-xs">
                  Dosyaları sürükleyin veya tıklayın
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  TXT, JSON, DOCX, PDF
                </p>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.json,.docx,.pdf"
                onChange={handleFileSelect}
                className="hidden"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-white text-xs font-medium">
                    Seçilen Dosyalar:
                  </p>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-700/50 rounded p-2"
                    >
                      <div className="flex items-center space-x-2">
                        <File className="w-3 h-3 text-blue-400" />
                        <div>
                          <p className="text-white text-xs truncate max-w-24">
                            {file.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {formatFileSize(file.size)} •{" "}
                            {formatDate(file.lastModified)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-400 hover:text-red-300"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supported Formats */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Supported Formats
              </label>
              <div className="space-y-1">
                {["txt", "json", "docx", "pdf"].map((format) => (
                  <label key={format} className="flex items-center space-x-2">
                    <Field
                      name="supported_formats"
                      type="checkbox"
                      value={format}
                      className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    />
                    <span className="text-white text-xs">
                      {format.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
              <ErrorMessage
                name="supported_formats"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Min Content Length */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Min Content Length
              </label>
              <Field
                name="min_content_length"
                type="range"
                min={1}
                max={1000}
                className="w-full text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>1</span>
                <span className="font-bold text-blue-400">
                  {values.min_content_length}
                </span>
                <span>1000</span>
              </div>
              <ErrorMessage
                name="min_content_length"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Max File Size */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Max File Size (MB)
              </label>
              <Field
                name="max_file_size_mb"
                type="range"
                min={1}
                max={100}
                className="w-full text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>1MB</span>
                <span className="font-bold text-green-400">
                  {values.max_file_size_mb}MB
                </span>
                <span>100MB</span>
              </div>
              <ErrorMessage
                name="max_file_size_mb"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Quality Threshold */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Quality Threshold
              </label>
              <Field
                name="quality_threshold"
                type="range"
                min={0}
                max={1}
                step={0.1}
                className="w-full text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>0.0</span>
                <span className="font-bold text-purple-400">
                  {values.quality_threshold?.toFixed(1) || "0.0"}
                </span>
                <span>1.0</span>
              </div>
              <ErrorMessage
                name="quality_threshold"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Storage Enabled */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Storage Enabled
              </label>
              <Field
                name="storage_enabled"
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-slate-900/80 border rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="storage_enabled"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Deduplicate */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Deduplicate
              </label>
              <Field
                name="deduplicate"
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-slate-900/80 border rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="deduplicate"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                ✕
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="text-xs px-2 py-1 bg-blue-600 rounded text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                ✓
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
