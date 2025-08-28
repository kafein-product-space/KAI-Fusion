// VectorStoreOrchestratorConfigForm.tsx
import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Database,
  Layers,
  Tag,
  Filter,
  Search,
  Zap,
  Info,
} from "lucide-react";
import JSONEditor from "~/components/common/JSONEditor";
import TabNavigation from "~/components/common/TabNavigation";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import CredentialSelector from "~/components/credentials/CredentialSelector";

// Standard props interface matching other config forms
interface VectorStoreOrchestratorConfigFormProps {
  configData?: any;
  onSave?: (values: any) => void;
  onCancel: () => void;
  initialValues?: any;
  validate?: (values: any) => any;
  onSubmit?: (values: any) => void;
}

export default function VectorStoreOrchestratorConfigForm({
  configData,
  onSave,
  onCancel,
  initialValues: propInitialValues,
  validate: propValidate,
  onSubmit: propOnSubmit,
}: VectorStoreOrchestratorConfigFormProps) {
  // Default values for missing fields
  const initialValues = propInitialValues || {
    credential_id: configData?.credential_id || "",
    connection_string: configData?.connection_string || "",
    collection_name: configData?.collection_name || "",
    table_prefix: configData?.table_prefix || "",
    custom_metadata: configData?.custom_metadata || "{}",
    preserve_document_metadata: configData?.preserve_document_metadata ?? true,
    metadata_strategy: configData?.metadata_strategy || "merge",
    search_algorithm: configData?.search_algorithm || "cosine",
    search_k: configData?.search_k || 10,
    score_threshold: configData?.score_threshold || 0.0,
    batch_size: configData?.batch_size || 100,
    pre_delete_collection: configData?.pre_delete_collection ?? false,
    enable_hnsw_index: configData?.enable_hnsw_index ?? true,
  };

  // Validation function
  const validate = propValidate || ((values: any) => {
    const errors: any = {};

    if (!values.collection_name) {
      errors.collection_name = "Collection name is required";
    }
    if (!values.connection_string) {
      errors.connection_string = "Connection string is required";
    }
    // Validate JSON metadata
    if (values.custom_metadata) {
      try {
        JSON.parse(values.custom_metadata);
      } catch (e) {
        errors.custom_metadata = "Invalid JSON format";
      }
    }

    return errors;
  });

  // Use the provided onSubmit or fallback to onSave
  const handleSubmit = propOnSubmit || onSave;
  
  const [activeTab, setActiveTab] = useState("data");
  const { userCredentials, fetchCredentials } = useUserCredentialStore();

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const tabs = [
    {
      id: "data",
      label: "Data",
      icon: Database,
      description: "Database connection and collection settings",
    },
    {
      id: "metadata",
      label: "Metadata",
      icon: Tag,
      description: "Custom metadata and strategy configuration",
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      description: "Search algorithm and performance settings",
    },
  ];

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={(values, { setSubmitting }) => {
          if (handleSubmit) {
            handleSubmit(values);
          }
          setSubmitting(false);
        }}
        enableReinitialize
      >
        {({
          values,
          errors,
          touched,
          isSubmitting,
          isValid,
          handleSubmit,
          setFieldValue,
          setFieldTouched,
        }) => {
          // Tab değişiminde sadece tab'ı değiştir, form submit'i tetikleme
          const handleTabChange = (tabId: string) => {
            // Form submit'i tetiklememek için preventDefault
            setActiveTab(tabId);
          };

          return (
            <Form
              className="space-y-6 w-full h-full"
              onSubmit={handleSubmit}
              id="vectorstore-config-form"
            >
              {/* Tab Navigation */}
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mb-6"
              />

              {/* Tab Content */}
              <div className="space-y-6">
                {/* Data Configuration Tab */}
                {activeTab === "data" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-sm font-semibold text-blue-400 uppercase tracking-wider">
                      <Database className="w-5 h-5" />
                      Data Configuration
                    </div>

                    {/* Credential ID */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Select Credential
                      </label>
                      <CredentialSelector
                        value={values.credential_id}
                        onChange={async (credentialId) => {
                          setFieldValue("credential_id", credentialId);
                          if (credentialId) {
                            try {
                              const credentialSecret =
                                await getUserCredentialSecret(credentialId);
                              const secret = credentialSecret?.secret || {};
                              // Prefer direct connection_string if provided
                              if (secret.connection_string) {
                                setFieldValue(
                                  "connection_string",
                                  secret.connection_string
                                );
                              } else {
                                // Build connection string from discrete fields if possible
                                const host = secret.host;
                                const port = secret.port;
                                const database = secret.database;
                                const username = secret.username;
                                const password = secret.password;
                                if (
                                  host &&
                                  port &&
                                  database &&
                                  username &&
                                  typeof password !== "undefined"
                                ) {
                                  const userEnc = encodeURIComponent(username);
                                  const passEnc = encodeURIComponent(password);
                                  const builtConn = `postgresql://${userEnc}:${passEnc}@${host}:${port}/${database}`;
                                  setFieldValue("connection_string", builtConn);
                                }
                              }

                              // Optional convenience fills
                              if (secret.collection_name) {
                                setFieldValue(
                                  "collection_name",
                                  secret.collection_name
                                );
                              }
                              if (secret.table_prefix) {
                                setFieldValue(
                                  "table_prefix",
                                  secret.table_prefix
                                );
                              }
                            } catch (error) {
                              console.error(
                                "Failed to fetch credential secret:",
                                error
                              );
                            }
                          }
                        }}
                        onCredentialLoad={(secret) => {
                          if (!secret) return;
                          if (secret.connection_string) {
                            setFieldValue(
                              "connection_string",
                              secret.connection_string
                            );
                          } else {
                            const host = secret.host;
                            const port = secret.port;
                            const database = secret.database;
                            const username = secret.username;
                            const password = secret.password;
                            if (
                              host &&
                              port &&
                              database &&
                              username &&
                              typeof password !== "undefined"
                            ) {
                              const userEnc = encodeURIComponent(username);
                              const passEnc = encodeURIComponent(password);
                              const builtConn = `postgresql://${userEnc}:${passEnc}@${host}:${port}/${database}`;
                              setFieldValue("connection_string", builtConn);
                            }
                          }

                          if (secret.collection_name) {
                            setFieldValue(
                              "collection_name",
                              secret.collection_name
                            );
                          }
                          if (secret.table_prefix) {
                            setFieldValue("table_prefix", secret.table_prefix);
                          }
                        }}
                        serviceType="postgresql_vectorstore"
                        placeholder="Select Credential"
                        showCreateNew={true}
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <ErrorMessage
                        name="credential_id"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Connection String */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Connection String
                      </label>
                      <Field
                        name="connection_string"
                        type="password"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <ErrorMessage
                        name="connection_string"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Collection Name - Required */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Collection Name *
                      </label>
                      <Field
                        name="collection_name"
                        type="text"
                        placeholder="e.g., amazon_products, user_manuals, company_docs"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <ErrorMessage
                        name="collection_name"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Vector collection name - separates different datasets
                        (REQUIRED for data isolation)
                      </p>
                    </div>

                    {/* Table Prefix - New */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Table Prefix (Optional)
                      </label>
                      <Field
                        name="table_prefix"
                        type="text"
                        placeholder="e.g., project1_, client_a_"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <ErrorMessage
                        name="table_prefix"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Custom table prefix for complete database isolation
                        (optional)
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata Configuration Tab */}
                {activeTab === "metadata" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-sm font-semibold text-purple-400 uppercase tracking-wider">
                      <Tag className="w-5 h-5" />
                      Metadata Configuration
                    </div>

                    {/* Custom Metadata */}
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <label className="text-white text-sm font-medium">
                          Custom Metadata
                        </label>
                        <div className="relative group">
                          <Info className="w-4 h-4 text-blue-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg shadow-lg text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-96">
                            <div className="space-y-3">
                              <div>
                                <strong className="text-blue-400">
                                  Recommended Format:
                                </strong>
                                <pre className="text-sm text-slate-300 bg-slate-900 p-3 rounded mt-2 overflow-x-auto">
                                  {`{
  "source": "amazon_catalog",
  "category": "electronics", 
  "version": "2024",
  "language": "en",
  "author": "company_name",
  "tags": ["product", "review"],
  "priority": "high"
}`}
                                </pre>
                              </div>
                              <div>
                                <strong className="text-green-400">
                                  Common Fields:
                                </strong>
                                <ul className="text-sm text-slate-300 mt-2 space-y-1">
                                  <li>
                                    • <code>source</code>: Data source
                                    identifier
                                  </li>
                                  <li>
                                    • <code>category</code>: Content category
                                  </li>
                                  <li>
                                    • <code>language</code>: Content language
                                  </li>
                                  <li>
                                    • <code>author</code>: Content
                                    author/creator
                                  </li>
                                  <li>
                                    • <code>tags</code>: Array of tags
                                  </li>
                                  <li>
                                    • <code>priority</code>: Content priority
                                    level
                                  </li>
                                </ul>
                              </div>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                          </div>
                        </div>
                      </div>
                      <JSONEditor
                        value={values.custom_metadata || "{}"}
                        onChange={(value) =>
                          setFieldValue("custom_metadata", value)
                        }
                        placeholder='{"source": "amazon_catalog", "category": "electronics", "version": "2024"}'
                        description="Custom metadata to add to all documents (JSON format)"
                        height={120}
                        error={errors.custom_metadata as string}
                      />
                    </div>

                    {/* Preserve Document Metadata */}
                    <div>
                      <label className="flex items-center gap-3 text-white text-sm font-medium mb-2">
                        <Field
                          name="preserve_document_metadata"
                          type="checkbox"
                          className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          onMouseDown={(e: any) => e.stopPropagation()}
                          onTouchStart={(e: any) => e.stopPropagation()}
                        />
                        Preserve Document Metadata
                      </label>
                      <p className="text-sm text-slate-400 ml-8">
                        Keep original document metadata alongside custom
                        metadata
                      </p>
                      <ErrorMessage
                        name="preserve_document_metadata"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Metadata Strategy */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Metadata Strategy
                      </label>
                      <Field
                        as="select"
                        name="metadata_strategy"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      >
                        <option value="merge">
                          Merge (custom overrides document)
                        </option>
                        <option value="replace">
                          Replace (only custom metadata)
                        </option>
                        <option value="document_only">Document Only</option>
                      </Field>
                      <p className="text-sm text-slate-400 mt-1">
                        How to handle metadata conflicts
                      </p>
                      <ErrorMessage
                        name="metadata_strategy"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Search Configuration Tab */}
                {activeTab === "search" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-sm font-semibold text-green-400 uppercase tracking-wider">
                      <Search className="w-5 h-5" />
                      Search Configuration
                    </div>

                    {/* Search Algorithm */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Search Algorithm
                      </label>
                      <Field
                        as="select"
                        name="search_algorithm"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      >
                        <option value="cosine">Cosine Similarity</option>
                        <option value="euclidean">Euclidean Distance</option>
                        <option value="inner_product">Inner Product</option>
                      </Field>
                      <ErrorMessage
                        name="search_algorithm"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Search K */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Search K
                      </label>
                      <Field
                        name="search_k"
                        type="range"
                        min={1}
                        max={50}
                        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider:bg-blue-500"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <div className="flex justify-between text-sm text-gray-300 mt-2">
                        <span>1</span>
                        <span className="font-bold text-blue-400 text-lg">
                          {values.search_k}
                        </span>
                        <span>50</span>
                      </div>
                      <ErrorMessage
                        name="search_k"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Score Threshold */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Score Threshold
                      </label>
                      <Field
                        name="score_threshold"
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <div className="flex justify-between text-sm text-gray-300 mt-2">
                        <span>0.0</span>
                        <span className="font-bold text-purple-400 text-lg">
                          {values.score_threshold?.toFixed(1) || "0.0"}
                        </span>
                        <span>1.0</span>
                      </div>
                      <ErrorMessage
                        name="score_threshold"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Batch Size */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Batch Size
                      </label>
                      <Field
                        name="batch_size"
                        type="range"
                        min={10}
                        max={1000}
                        step={10}
                        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onTouchStart={(e: any) => e.stopPropagation()}
                      />
                      <div className="flex justify-between text-sm text-gray-300 mt-2">
                        <span>10</span>
                        <span className="font-bold text-green-400 text-lg">
                          {values.batch_size}
                        </span>
                        <span>1000</span>
                      </div>
                      <ErrorMessage
                        name="batch_size"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Pre Delete Collection */}
                    <div>
                      <label className="flex items-center gap-3 text-white text-sm font-medium mb-2">
                        <Field
                          name="pre_delete_collection"
                          type="checkbox"
                          className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          onMouseDown={(e: any) => e.stopPropagation()}
                          onTouchStart={(e: any) => e.stopPropagation()}
                        />
                        Pre Delete Collection
                      </label>
                      <p className="text-sm text-slate-400 ml-8">
                        Delete existing collection before creating new one
                      </p>
                      <ErrorMessage
                        name="pre_delete_collection"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Enable HNSW Index */}
                    <div>
                      <label className="flex items-center gap-3 text-white text-sm font-medium mb-2">
                        <Field
                          name="enable_hnsw_index"
                          type="checkbox"
                          className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          onMouseDown={(e: any) => e.stopPropagation()}
                          onTouchStart={(e: any) => e.stopPropagation()}
                        />
                        Enable HNSW Index
                      </label>
                      <p className="text-sm text-slate-400 ml-8">
                        Use HNSW index for faster similarity search
                      </p>
                      <ErrorMessage
                        name="enable_hnsw_index"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
