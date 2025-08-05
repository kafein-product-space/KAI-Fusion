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
import type { WebScraperConfig } from "./types";
import TabNavigation from "~/components/common/TabNavigation";

interface WebScraperConfigFormProps {
  initialValues: WebScraperConfig;
  validate: (values: WebScraperConfig) => any;
  onSubmit: (values: WebScraperConfig) => void;
  onCancel: () => void;
  onScrapeUrls?: () => void;
  onPreviewUrl?: (url: string) => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  isScraping?: boolean;
  scrapedDocuments?: any[];
  progress?: any;
}

export default function WebScraperConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
  onScrapeUrls,
  onPreviewUrl,
  onCopyToClipboard,
  isScraping,
  scrapedDocuments,
  progress,
}: WebScraperConfigFormProps) {
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
    <div className="relative p-2 w-80 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            Web Scraper
          </span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={(values, { setSubmitting }) => {
          console.log("Form submitted with values:", values);
          onSubmit(values);
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
            <Form className="space-y-3 w-full p-3" onSubmit={handleSubmit}>
              {/* Tab Navigation */}
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mb-4"
              />

              {/* Tab Content */}
              <div className="space-y-3">
                {/* Basic Configuration Tab */}
                {activeTab === "basic" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      <Settings className="w-3 h-3" />
                      <span>Basic Settings</span>
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        URLs to Scrape
                      </label>
                      <Field
                        as="textarea"
                        name="urls"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="https://example.com\nhttps://example.org"
                        rows={4}
                      />
                      <ErrorMessage
                        name="urls"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        User Agent
                      </label>
                      <Field
                        type="text"
                        name="user_agent"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="Default KAI-Fusion"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Remove Selectors
                      </label>
                      <Field
                        as="textarea"
                        name="remove_selectors"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="nav,footer,header,script,style,aside,noscript,form"
                        rows={2}
                      />
                      <p className="text-slate-400 text-xs mt-1">
                        CSS selectors to remove from scraped content
                      </p>
                    </div>
                  </div>
                )}

                {/* Advanced Configuration Tab */}
                {activeTab === "advanced" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      <Zap className="w-3 h-3" />
                      <span>Advanced Settings</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-white text-xs font-medium mb-1 block">
                          Min Content Length
                        </label>
                        <Field
                          type="number"
                          name="min_content_length"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="text-white text-xs font-medium mb-1 block">
                          Max Concurrent
                        </label>
                        <Field
                          type="number"
                          name="max_concurrent"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                          min="1"
                          max="10"
                        />
                      </div>

                      <div>
                        <label className="text-white text-xs font-medium mb-1 block">
                          Timeout (seconds)
                        </label>
                        <Field
                          type="number"
                          name="timeout_seconds"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                          min="5"
                          max="300"
                        />
                      </div>

                      <div>
                        <label className="text-white text-xs font-medium mb-1 block">
                          Retry Attempts
                        </label>
                        <Field
                          type="number"
                          name="retry_attempts"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                          min="0"
                          max="5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Tavily API Key (Optional)
                      </label>
                      <Field
                        type="password"
                        name="tavily_api_key"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="Enter your Tavily API key"
                      />
                      <p className="text-slate-400 text-xs mt-1">
                        Used for enhanced web search capabilities
                      </p>
                    </div>
                  </div>
                )}

                {/* Testing Configuration Tab */}
                {activeTab === "testing" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                      <Search className="w-3 h-3" />
                      <span>Testing & Preview</span>
                    </div>

                    {/* Scrape Button */}
                    <div>
                      <button
                        type="button"
                        onClick={onScrapeUrls}
                        disabled={isScraping}
                        className="btn btn-sm w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white border-0"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {isScraping ? "Scraping..." : "Start Scraping"}
                      </button>
                    </div>

                    {/* Progress Indicator */}
                    {progress && (
                      <div className="bg-slate-800/50 p-2 rounded text-xs text-white">
                        <div className="flex items-center gap-1 mb-1">
                          <Activity className="w-2 h-2 text-blue-400" />
                          <span>Progress: {progress.completedUrls}/{progress.totalUrls}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{
                              width: `${(progress.completedUrls / progress.totalUrls) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Scraped Documents Count */}
                    {scrapedDocuments && scrapedDocuments.length > 0 && (
                      <div className="bg-slate-800/50 p-2 rounded text-xs text-white">
                        <div className="flex items-center gap-1 mb-1">
                          <FileText className="w-2 h-2 text-green-400" />
                          <span>Scraped Documents: {scrapedDocuments.length}</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {scrapedDocuments.slice(0, 3).map((doc, index) => (
                            <div
                              key={index}
                              className="bg-slate-700/50 p-1 rounded text-xs"
                            >
                              <div className="text-blue-400 truncate">
                                {doc.url}
                              </div>
                              <div className="text-slate-300 text-xs">
                                {doc.contentLength} chars
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-white/20">
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn btn-sm btn-ghost text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="btn btn-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white border-0"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
} 