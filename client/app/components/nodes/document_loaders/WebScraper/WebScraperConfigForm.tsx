import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Globe,
  Download,
  Trash2,
  Zap,
  Clock,
  Shield,
  Activity,
  BarChart3,
  FileText,
  Search,
  Filter,
  Key,
} from "lucide-react";
import TabNavigation from "~/components/common/TabNavigation";
import CredentialSelector from "~/components/credentials/CredentialSelector";
import { getUserCredentialSecret } from "~/services/userCredentialService";

// Standard props interface matching other config forms
interface WebScraperConfigFormProps {
  configData: any;
  onSave: (values: any) => void;
  onCancel: () => void;
}

export default function WebScraperConfigForm({
  configData,
  onSave,
  onCancel,
}: WebScraperConfigFormProps) {
  
  // Default values for missing fields
  const initialValues = {
    credential_id: configData?.credential_id || "",
    proxy_url: configData?.proxy_url || "",
    proxy_username: configData?.proxy_username || "",
    proxy_password: configData?.proxy_password || "",
    urls: configData?.urls || [""],
    css_selectors: configData?.css_selectors || [],
    exclude_selectors: configData?.exclude_selectors || [],
    headers: configData?.headers || {},
    max_concurrent: configData?.max_concurrent || 5,
    delay_between_requests: configData?.delay_between_requests || 1,
    timeout: configData?.timeout || 30,
    user_agent: configData?.user_agent || "",
    follow_redirects: configData?.follow_redirects ?? true,
    verify_ssl: configData?.verify_ssl ?? true,
    extract_images: configData?.extract_images ?? false,
    extract_links: configData?.extract_links ?? false,
    clean_html: configData?.clean_html ?? true,
    chunk_size: configData?.chunk_size || 1000,
    chunk_overlap: configData?.chunk_overlap || 100,
  };

  // Validation function
  const validate = (values: any) => {
    const errors: any = {};
    if (!values.urls || values.urls.length === 0 || !values.urls[0]) {
      errors.urls = "At least one URL is required";
    }
    if (values.max_concurrent < 1 || values.max_concurrent > 50) {
      errors.max_concurrent = "Max concurrent requests must be between 1 and 50";
    }
    if (values.delay_between_requests < 0 || values.delay_between_requests > 60) {
      errors.delay_between_requests = "Delay must be between 0 and 60 seconds";
    }
    if (values.timeout < 5 || values.timeout > 300) {
      errors.timeout = "Timeout must be between 5 and 300 seconds";
    }
    return errors;
  };
  const [activeTab, setActiveTab] = useState("basic");

  const tabs = [
    {
      id: "basic",
      label: "Basic",
      icon: Settings,
      description: "Basic scraping configuration",
    },
    {
      id: "advanced",
      label: "Advanced",
      icon: Zap,
      description: "Advanced scraping settings",
    },
    {
      id: "testing",
      label: "Testing",
      icon: Search,
      description: "Test scraping and preview",
    },
  ];

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={(values, { setSubmitting }) => {
          console.log("Form submitted with values:", values);
          onSave(values);
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
          const handleTabChange = (tabId: string) => {
            setActiveTab(tabId);
          };

          return (
            <Form className="space-y-8 w-full p-6" onSubmit={handleSubmit}>
              {/* Tab Navigation */}
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mb-4"
              />

              {/* Tab Content */}
              <div className="space-y-6">
                {/* Basic Configuration Tab */}
                {activeTab === "basic" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
                      <Settings className="w-3 h-3" />
                      <span>Basic Settings</span>
                    </div>

                    {/* Credential selection (moved here, above API key) */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Credential (Optional)
                      </label>
                      <CredentialSelector
                        value={(values as any).credential_id}
                        onChange={async (credentialId) => {
                          setFieldValue("credential_id", credentialId);
                          if (credentialId) {
                            try {
                              const result = await getUserCredentialSecret(
                                credentialId
                              );
                              if ((result as any)?.secret?.api_key) {
                                setFieldValue(
                                  "tavily_api_key",
                                  (result as any).secret.api_key
                                );
                              }
                            } catch (e) {
                              console.error(
                                "Failed to fetch credential secret:",
                                e
                              );
                            }
                          }
                        }}
                        onCredentialLoad={(secret) => {
                          if ((secret as any)?.api_key) {
                            setFieldValue(
                              "tavily_api_key",
                              (secret as any).api_key
                            );
                          }
                        }}
                        serviceType="tavily_search"
                        placeholder="Select Credential"
                        showCreateNew={true}
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        URLs to Scrape
                      </label>
                      <Field
                        as="textarea"
                        name="urls"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="https://example.com\nhttps://example.org"
                        rows={4}
                      />
                      <ErrorMessage
                        name="urls"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        User Agent
                      </label>
                      <Field
                        type="text"
                        name="user_agent"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="Default KAI-Fusion"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Remove Selectors
                      </label>
                      <Field
                        as="textarea"
                        name="remove_selectors"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="nav,footer,header,script,style,aside,noscript,form"
                        rows={2}
                      />
                      <p className="text-slate-400 text-sm mt-1">
                        CSS selectors to remove from scraped content
                      </p>
                    </div>
                  </div>
                )}

                {/* Advanced Configuration Tab */}
                {activeTab === "advanced" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-400 uppercase tracking-wider">
                      <Zap className="w-3 h-3" />
                      <span>Advanced Settings</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Min Content Length
                        </label>
                        <Field
                          type="number"
                          name="min_content_length"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Max Concurrent
                        </label>
                        <Field
                          type="number"
                          name="max_concurrent"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                          min="1"
                          max="10"
                        />
                      </div>

                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Timeout (seconds)
                        </label>
                        <Field
                          type="number"
                          name="timeout_seconds"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                          min="5"
                          max="300"
                        />
                      </div>

                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Retry Attempts
                        </label>
                        <Field
                          type="number"
                          name="retry_attempts"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                          min="0"
                          max="5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Tavily API Key (Optional)
                      </label>
                      <Field
                        type="password"
                        name="tavily_api_key"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="Enter your Tavily API key"
                      />
                      <p className="text-slate-400 text-sm mt-1">
                        Used for enhanced web search capabilities
                      </p>
                    </div>
                  </div>
                )}

                {/* Credentials Selection removed as requested */}

                {/* Testing Configuration Tab */}
                {activeTab === "testing" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                      <Search className="w-3 h-3" />
                      <span>Testing & Preview</span>
                    </div>

                    <div className="text-center text-gray-400 text-sm py-4">
                      Testing functionality will be available after configuration is saved.
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
