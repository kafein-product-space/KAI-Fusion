// CodeConfigForm.tsx
import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Code,
  Play,
  Settings,
  Clock,
  Layers,
  Zap,
  FileCode,
  Terminal,
  Cpu,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Lightbulb,
  BookOpen,
  Palette,
  RotateCcw,
} from "lucide-react";
import type { CodeNodeConfigFormProps } from "./types";
import { SUPPORTED_LANGUAGES, EXECUTION_MODES, EDITOR_THEMES } from "./types";
import CodeEditor from "./CodeEditor";

interface CodeNodeConfig {
  language: "python" | "javascript";
  mode: "all_items" | "each_item";
  code: string;
  timeout: number;
  continue_on_error: boolean;
  editor_preferences: {
    theme: "vs-dark" | "light" | "hc-black";
    font_size: number;
    show_line_numbers: boolean;
    wrap_code: boolean;
  };
}

export default function CodeConfigForm({
  configData,
  onSave,
  onCancel,
  initialValues: propInitialValues,
  validate: propValidate,
  onSubmit: propOnSubmit,
}: CodeNodeConfigFormProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<"python" | "javascript">("python");
  
  // Default values based on backend node configuration
  const initialValues: CodeNodeConfig = propInitialValues || {
    language: configData?.language || "python",
    mode: configData?.mode || "all_items",
    code: configData?.code || SUPPORTED_LANGUAGES.find(l => l.value === (configData?.language || "python"))?.defaultCode || "",
    timeout: configData?.timeout || 30,
    continue_on_error: configData?.continue_on_error ?? false,
    editor_preferences: {
      theme: configData?.editor_preferences?.theme || "vs-dark",
      font_size: configData?.editor_preferences?.font_size || 14,
      show_line_numbers: configData?.editor_preferences?.show_line_numbers ?? true,
      wrap_code: configData?.editor_preferences?.wrap_code ?? true,
    },
  };

  useEffect(() => {
    setSelectedLanguage(initialValues.language);
  }, [initialValues.language]);

  // Validation function
  const validate = propValidate || ((values: CodeNodeConfig) => {
    const errors: any = {};
    
    if (!values.language) {
      errors.language = "Programming language is required";
    }
    
    if (!values.mode) {
      errors.mode = "Execution mode is required";
    }
    
    if (!values.code || values.code.trim().length === 0) {
      errors.code = "Code is required";
    }
    
    if (values.timeout < 1 || values.timeout > 300) {
      errors.timeout = "Timeout must be between 1 and 300 seconds";
    }
    
    return errors;
  });

  // Handle language change
  const handleLanguageChange = (setFieldValue: any, language: "python" | "javascript") => {
    setSelectedLanguage(language);
    setFieldValue("language", language);
    
    // Update default code for selected language
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.value === language);
    if (langConfig) {
      setFieldValue("code", langConfig.defaultCode);
    }
  };

  // Use the provided onSubmit or fallback to onSave
  const handleSubmit = propOnSubmit || onSave || (() => {});

  const selectedLangConfig = SUPPORTED_LANGUAGES.find(l => l.value === selectedLanguage);
  const selectedModeConfig = EXECUTION_MODES.find(m => m.value === initialValues.mode);

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validate={validate}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-6 w-full p-6">
            {/* Language Selection */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <FileCode className="w-5 h-5 text-blue-400" />
                <label className="text-white font-semibold">Programming Language</label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => handleLanguageChange(setFieldValue, lang.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedLanguage === lang.value
                        ? `border-blue-500 bg-gradient-to-r ${lang.color} text-white shadow-lg scale-105`
                        : "border-slate-600 bg-slate-800/30 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <img 
                          src={lang.icon} 
                          alt={`${lang.label} icon`}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{lang.label}</div>
                        <div className="text-xs opacity-80">{lang.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <ErrorMessage
                name="language"
                component="div"
                className="text-red-400 text-sm mt-2"
              />
            </div>

            {/* Execution Mode */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Layers className="w-5 h-5 text-purple-400" />
                <label className="text-white font-semibold">Execution Mode</label>
              </div>
              
              <div className="space-y-3">
                {EXECUTION_MODES.map((mode) => (
                  <label
                    key={mode.value}
                    className={`flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-all ${
                      values.mode === mode.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-600 bg-slate-800/30 hover:border-slate-500"
                    }`}
                  >
                    <Field
                      type="radio"
                      name="mode"
                      value={mode.value}
                      className="mt-1 w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 flex items-center justify-center">
                          {mode.icon === "Layers" ? (
                            <Layers className="w-4 h-4" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-white font-medium">{mode.label}</span>
                      </div>
                      <div className="text-slate-400 text-sm mt-1">{mode.description}</div>
                      <div className="text-slate-500 text-xs mt-2">
                        <strong>Use case:</strong> {mode.use_case}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <ErrorMessage
                name="mode"
                component="div"
                className="text-red-400 text-sm mt-2"
              />
            </div>

            {/* Code Editor */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5 text-green-400" />
                  <label className="text-white font-semibold">
                    {selectedLangConfig?.label} Code Editor
                  </label>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Terminal className="w-4 h-4" />
                  <span>Professional IDE Experience</span>
                </div>
              </div>

              <CodeEditor
                value={values.code}
                onChange={(newValue) => setFieldValue("code", newValue)}
                language={selectedLanguage}
                theme={values.editor_preferences.theme}
                height="450px"
                fontSize={values.editor_preferences.font_size}
                showLineNumbers={values.editor_preferences.show_line_numbers}
                wordWrap={values.editor_preferences.wrap_code}
                minimap={true}
              />

              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-600/30">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-slate-300">
                    <div className="font-medium text-blue-400 mb-1">IDE Features:</div>
                    <ul className="space-y-1 text-slate-400">
                      <li>• <strong>Autocomplete</strong>: Type <code className="text-green-400">output</code>, <code className="text-green-400">items</code>, or <code className="text-green-400">_now</code> for suggestions</li>
                      <li>• <strong>Shortcuts</strong>: <code className="text-green-400">Ctrl+Enter</code> to run, <code className="text-green-400">Ctrl+/</code> to comment, <code className="text-green-400">Shift+Alt+F</code> to format</li>
                      <li>• <strong>Variables</strong>: Access <code className="text-green-400">{values.mode === "all_items" ? "items" : "item"}</code> for input data</li>
                      <li>• <strong>Output</strong>: Use <code className="text-green-400">output</code> or <code className="text-green-400">result</code> to return data</li>
                      {selectedLanguage === "python" && (
                        <li>• <strong>Helpers</strong>: <code className="text-green-400">_now()</code>, <code className="text-green-400">_utcnow()</code>, <code className="text-green-400">_json</code>, and safe modules</li>
                      )}
                      {selectedLanguage === "javascript" && (
                        <li>• <strong>Helpers</strong>: <code className="text-green-400">_now()</code>, <code className="text-green-400">_utcnow()</code>, <code className="text-green-400">_json</code>, and Node.js built-ins</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              
              <ErrorMessage
                name="code"
                component="div"
                className="text-red-400 text-sm mt-2"
              />
            </div>

            {/* Execution Settings */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-orange-400" />
                <label className="text-white font-semibold">Execution Settings</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timeout */}
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">
                    Timeout: <span className="text-orange-400 font-mono">{values.timeout}s</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Field
                      type="range"
                      name="timeout"
                      min="1"
                      max="300"
                      step="1"
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                      onMouseDown={(e: any) => e.stopPropagation()}
                      onTouchStart={(e: any) => e.stopPropagation()}
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>1s</span>
                      <span>300s</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Maximum execution time before timeout
                  </div>
                  <ErrorMessage
                    name="timeout"
                    component="div"
                    className="text-red-400 text-sm mt-1"
                  />
                </div>

                {/* Continue on Error */}
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">
                    Error Handling
                  </label>
                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Continue on Error</div>
                        <div className="text-slate-400 text-xs">Don't stop workflow if code fails</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Field
                        type="checkbox"
                        name="continue_on_error"
                        className="sr-only peer"
                      />
                      <div
                        className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer 
                        peer-checked:after:translate-x-full peer-checked:after:border-white 
                        after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                        after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                        peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-600"
                      ></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Preferences */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Palette className="w-5 h-5 text-pink-400" />
                <label className="text-white font-semibold">Editor Preferences</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Theme Selection */}
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">Theme</label>
                  <Field
                    as="select"
                    name="editor_preferences.theme"
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                      text-white px-3 py-2 focus:border-pink-500 focus:ring-2 
                      focus:ring-pink-500/20 transition-all"
                    onMouseDown={(e: any) => e.stopPropagation()}
                    onTouchStart={(e: any) => e.stopPropagation()}
                  >
                    {EDITOR_THEMES.map((theme) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </Field>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">
                    Font Size: <span className="text-pink-400 font-mono">{values.editor_preferences.font_size}px</span>
                  </label>
                  <Field
                    type="range"
                    name="editor_preferences.font_size"
                    min="10"
                    max="20"
                    step="1"
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                      [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-pink-500
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                    onMouseDown={(e: any) => e.stopPropagation()}
                    onTouchStart={(e: any) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Line Numbers */}
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-400">#</span>
                    <div className="text-white text-sm">Show Line Numbers</div>
                  </div>
                  <Field
                    type="checkbox"
                    name="editor_preferences.show_line_numbers"
                    className="w-4 h-4 text-pink-600 bg-slate-700 border-slate-600 rounded focus:ring-pink-500"
                  />
                </div>

                {/* Word Wrap */}
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-400">↵</span>
                    <div className="text-white text-sm">Wrap Long Lines</div>
                  </div>
                  <Field
                    type="checkbox"
                    name="editor_preferences.wrap_code"
                    className="w-4 h-4 text-pink-600 bg-slate-700 border-slate-600 rounded focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Information Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code Security */}
              <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h5 className="text-white font-semibold">Security Features</h5>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Sandboxed execution environment</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Resource limits and timeout protection</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Whitelisted modules and functions only</span>
                  </div>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center space-x-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-blue-400" />
                  <h5 className="text-white font-semibold">Performance Tips</h5>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Use "all_items" mode for batch processing</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Keep timeout reasonable for your workload</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Use continue_on_error for fault tolerance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Configuration Summary */}
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-600/20">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="w-5 h-5 text-cyan-400" />
                <h5 className="text-white font-semibold">Configuration Summary</h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-slate-400">Language</div>
                  <div className="text-white font-medium">{selectedLangConfig?.label}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Mode</div>
                  <div className="text-white font-medium">{selectedModeConfig?.label.split(' ')[0]}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Timeout</div>
                  <div className="text-white font-medium">{values.timeout}s</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Error Handling</div>
                  <div className="text-white font-medium">{values.continue_on_error ? "Continue" : "Stop"}</div>
                </div>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}