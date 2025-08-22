// ToolAgentConfigForm.tsx
import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Settings, Bot } from "lucide-react";

// Standard props interface matching other config forms
interface ToolAgentConfigFormProps {
  configData: any;
  onSave: (values: any) => void;
  onCancel: () => void;
}

export default function ToolAgentConfigForm({
  configData,
  onSave,
  onCancel,
}: ToolAgentConfigFormProps) {
  // Default values for missing fields
  const initialValues = {
    agent_type: configData?.agent_type || "react",
    system_prompt: configData?.system_prompt || "You are a helpful assistant. Use tools to answer: {input}",
    max_iterations: configData?.max_iterations || 5,
    temperature: configData?.temperature || 0.7,
    enable_memory: configData?.enable_memory ?? true,
    enable_tools: configData?.enable_tools ?? true,
  };

  // Validation function
  const validate = (values: any) => {
    const errors: any = {};
    if (!values.agent_type) {
      errors.agent_type = "Agent type is required";
    }
    if (!values.system_prompt) {
      errors.system_prompt = "System prompt is required";
    }
    if (
      !values.max_iterations ||
      values.max_iterations < 1 ||
      values.max_iterations > 20
    ) {
      errors.max_iterations = "Max iterations must be between 1 and 20";
    }
    if (
      values.temperature === undefined ||
      values.temperature < 0 ||
      values.temperature > 2
    ) {
      errors.temperature = "Temperature must be between 0 and 2";
    }
    return errors;
  };
  return (
    <div className="relative w-full h-auto rounded-2xl flex flex-col bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-6 py-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-white" />
          <span className="text-white text-lg font-medium">Tool Agent Configuration</span>
        </div>
        <Settings className="w-6 h-6 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={onSave}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form className="space-y-6 w-full p-6">
            {/* Agent Type */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Agent Type
              </label>
              <Field
                as="select"
                name="agent_type"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="react">ReAct Agent ⭐</option>
                <option value="conversational">Conversational Agent</option>
                <option value="task_oriented">Task-Oriented Agent</option>
              </Field>
              <ErrorMessage
                name="agent_type"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                System Prompt
              </label>
              <Field
                as="textarea"
                name="system_prompt"
                rows={6}
                placeholder="You are a helpful assistant. Use tools to answer: {input}"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="text-sm text-gray-400 mt-2">
                Use {"{input}"} for user input. Define agent behavior and
                capabilities.
              </div>
              <ErrorMessage
                name="system_prompt"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Max Iterations */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Max Iterations: <span className="text-blue-400 font-mono">{values.max_iterations}</span>
              </label>
              <Field
                name="max_iterations"
                type="range"
                min={1}
                max={20}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>Quick (1)</span>
                <span>Thorough (20)</span>
              </div>
              <ErrorMessage
                name="max_iterations"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Temperature: <span className="text-purple-400 font-mono">{values.temperature?.toFixed(1) || "0.0"}</span>
              </label>
              <Field
                name="temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>Precise (0.0)</span>
                <span>Creative (2.0)</span>
              </div>
              <ErrorMessage
                name="temperature"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Enable Memory */}
            <div>
              <label className="text-white text-sm font-medium mb-3 flex items-center gap-3">
                <Field
                  name="enable_memory"
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <span>Enable Memory</span>
              </label>
              <div className="text-sm text-gray-400 ml-8">
                Allow agent to remember previous interactions
              </div>
              <ErrorMessage
                name="enable_memory"
                component="div"
                className="text-red-400 text-xs mt-1 ml-8"
              />
            </div>

            {/* Enable Tools */}
            <div>
              <label className="text-white text-sm font-medium mb-3 flex items-center gap-3">
                <Field
                  name="enable_tools"
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <span>Enable Tools</span>
              </label>
              <div className="text-sm text-gray-400 ml-8">
                Allow agent to use connected tools and functions
              </div>
              <ErrorMessage
                name="enable_tools"
                component="div"
                className="text-red-400 text-xs mt-1 ml-8"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-600">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
