// ToolAgentConfigForm.tsx
import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Settings, Bot } from "lucide-react";
import type { ToolAgentConfigFormProps } from "./types";
import { BackgroundGradient } from "~/components/BackgroundGradient";

export default function ToolAgentConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: ToolAgentConfigFormProps) {
  return (
    <BackgroundGradient className="relative w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">Agent</span>
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
            {/* Agent Type */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Agent Type
              </label>
              <Field
                as="select"
                name="agent_type"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
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
              <label className="text-white text-xs font-medium mb-1 block">
                System Prompt
              </label>
              <Field
                as="textarea"
                name="system_prompt"
                rows={3}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border resize-none"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="system_prompt"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Max Iterations */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Max Iterations
              </label>
              <Field
                name="max_iterations"
                type="range"
                min={1}
                max={20}
                className="w-full text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>1</span>
                <span className="font-bold text-blue-400">
                  {values.max_iterations}
                </span>
                <span>20</span>
              </div>
              <ErrorMessage
                name="max_iterations"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Temperature
              </label>
              <Field
                name="temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                className="w-full text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>0.0</span>
                <span className="font-bold text-purple-400">
                  {values.temperature?.toFixed(1) || "0.0"}
                </span>
                <span>2.0</span>
              </div>
              <ErrorMessage
                name="temperature"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Enable Memory */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Enable Memory
              </label>
              <Field
                name="enable_memory"
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-slate-900/80 border rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="enable_memory"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Enable Tools */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Enable Tools
              </label>
              <Field
                name="enable_tools"
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-slate-900/80 border rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="enable_tools"
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
    </BackgroundGradient>
  );
}
