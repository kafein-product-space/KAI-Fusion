import React, { useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Settings, Search, Filter } from "lucide-react";
import JSONEditor from "~/components/common/JSONEditor";
import CredentialSelector from "~/components/credentials/CredentialSelector";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
// Standard props interface matching other config forms
interface RetrieverConfigFormProps {
  configData: any;
  onSave: (values: any) => void;
  onCancel: () => void;
}

export default function RetrieverConfigForm({
  configData,
  onSave,
  onCancel,
}: RetrieverConfigFormProps) {
  const { userCredentials, fetchCredentials } = useUserCredentialStore();

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Default values for missing fields
  const initialValues = {
    credential_id: configData?.credential_id || "",
    database_connection: configData?.database_connection || "",
    collection_name: configData?.collection_name || "",
    search_k: configData?.search_k || 6,
    search_type: configData?.search_type || "similarity",
    score_threshold: configData?.score_threshold || 0.0,
    enable_metadata_filtering: configData?.enable_metadata_filtering || false,
    metadata_filter: configData?.metadata_filter || "{}",
    filter_strategy: configData?.filter_strategy || "exact",
  };

  // Validation function
  const validate = (values: any) => {
    const errors: any = {};
    if (!values.database_connection) {
      errors.database_connection = "Database connection is required";
    }
    if (!values.collection_name) {
      errors.collection_name = "Collection name is required";
    }
    if (!values.search_k || values.search_k < 1 || values.search_k > 50) {
      errors.search_k = "Search K must be between 1 and 50";
    }
    if (!values.search_type) {
      errors.search_type = "Search type is required";
    }
    if (
      values.score_threshold === undefined ||
      values.score_threshold < 0 ||
      values.score_threshold > 1
    ) {
      errors.score_threshold = "Score threshold must be between 0 and 1";
    }

    // Validate metadata filter JSON if enabled
    if (values.enable_metadata_filtering && values.metadata_filter) {
      try {
        JSON.parse(values.metadata_filter);
      } catch {
        errors.metadata_filter = "Invalid JSON format";
      }
    }

    return errors;
  };

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={onSave}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-8 w-full p-6">
            {/* Search Configuration Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
                <Search className="w-4 h-4" />
                Search Configuration
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
                        const credentialSecret = await getUserCredentialSecret(
                          credentialId
                        );
                        const secret = credentialSecret?.secret || {};
                        // Prefer direct connection_string if provided
                        if (secret.connection_string) {
                          setFieldValue(
                            "database_connection",
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
                            setFieldValue("database_connection", builtConn);
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
                          setFieldValue("table_prefix", secret.table_prefix);
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
                        "database_connection",
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
                        setFieldValue("database_connection", builtConn);
                      }
                    }

                    if (secret.collection_name) {
                      setFieldValue("collection_name", secret.collection_name);
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

              {/* Database Connection */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Database Connection
                </label>
                <Field
                  name="database_connection"
                  type="password"
                  className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <ErrorMessage
                  name="database_connection"
                  component="div"
                  className="text-red-400 text-sm mt-1"
                />
              </div>

              {/* Collection Name */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Collection Name
                </label>
                <Field
                  name="collection_name"
                  type="text"
                  placeholder="e.g., documents, products, knowledge_base"
                  className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <ErrorMessage
                  name="collection_name"
                  component="div"
                  className="text-red-400 text-sm mt-1"
                />
              </div>

              {/* Search Type */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Search Type
                </label>
                <Field
                  as="select"
                  name="search_type"
                  className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                >
                  <option value="similarity">Similarity Search</option>
                  <option value="mmr">MMR (Maximal Marginal Relevance)</option>
                </Field>
                <div className="text-sm text-gray-400 mt-2">
                  Similarity search for exact matches, MMR for diverse results
                </div>
                <ErrorMessage
                  name="search_type"
                  component="div"
                  className="text-red-400 text-sm mt-1"
                />
              </div>

              {/* Search K */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Search K:{" "}
                  <span className="text-blue-400 font-mono">
                    {values.search_k}
                  </span>
                </label>
                <Field
                  name="search_k"
                  type="range"
                  min={1}
                  max={50}
                  className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>Few Results (1)</span>
                  <span>Many Results (50)</span>
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
                  Score Threshold:{" "}
                  <span className="text-purple-400 font-mono">
                    {values.score_threshold.toFixed(2)}
                  </span>
                </label>
                <Field
                  name="score_threshold"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>Inclusive (0.0)</span>
                  <span>Strict (1.0)</span>
                </div>
                <ErrorMessage
                  name="score_threshold"
                  component="div"
                  className="text-red-400 text-sm mt-1"
                />
              </div>
            </div>

            {/* Metadata Filtering Section */}
            <div className="space-y-6 pt-6 border-t border-gray-600">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-400 uppercase tracking-wider">
                <Filter className="w-4 h-4" />
                Metadata Filtering
              </div>

              {/* Enable Metadata Filtering */}
              <div>
                <label className="text-white text-sm font-medium mb-3 flex items-center gap-3">
                  <Field
                    name="enable_metadata_filtering"
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    onMouseDown={(e: any) => e.stopPropagation()}
                    onTouchStart={(e: any) => e.stopPropagation()}
                  />
                  <span>Enable Metadata Filtering</span>
                </label>
                <div className="text-sm text-gray-400 ml-8">
                  Enable metadata-based filtering for search results
                </div>
                <ErrorMessage
                  name="enable_metadata_filtering"
                  component="div"
                  className="text-red-400 text-sm mt-1 ml-8"
                />
              </div>

              {/* Metadata Filter - Conditional */}
              {values.enable_metadata_filtering && (
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Metadata Filter
                  </label>
                  <JSONEditor
                    value={values.metadata_filter || "{}"}
                    onChange={(value) =>
                      setFieldValue("metadata_filter", value)
                    }
                    placeholder='{"data_type": "products", "category": "electronics"}'
                    description="Filter documents by metadata (JSON format)"
                    height={120}
                    error={errors.metadata_filter as string}
                  />
                </div>
              )}

              {/* Filter Strategy - Conditional */}
              {values.enable_metadata_filtering && (
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Filter Strategy
                  </label>
                  <Field
                    as="select"
                    name="filter_strategy"
                    className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    onMouseDown={(e: any) => e.stopPropagation()}
                    onTouchStart={(e: any) => e.stopPropagation()}
                  >
                    <option value="exact">Exact Match</option>
                    <option value="contains">Contains</option>
                    <option value="or">Any Match (OR)</option>
                  </Field>
                  <div className="text-sm text-gray-400 mt-2">
                    How to apply metadata filters
                  </div>
                  <ErrorMessage
                    name="filter_strategy"
                    component="div"
                    className="text-red-400 text-sm mt-1"
                  />
                </div>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
