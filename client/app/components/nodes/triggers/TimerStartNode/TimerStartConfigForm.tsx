// TimerStartConfigForm.tsx
import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Clock,
  Settings,
  Calendar,
  Zap,
  Play,
  Pause,
  Globe,
  Code,
  CheckCircle,
  AlertCircle,
  Timer,
  CalendarDays,
  Repeat,
  Hash,
  Activity,
  Sparkles,
  X,
} from "lucide-react";
import type { TimerStartConfigFormProps } from "./types";

// Schedule Type Options with enhanced descriptions
const SCHEDULE_TYPES = [
  {
    value: "interval",
    label: "Interval ⭐",
    description: "Run at regular intervals",
    icon: "⏰",
  },
  {
    value: "cron",
    label: "Cron Expression",
    description: "Use cron expression for complex scheduling",
    icon: "📅",
  },
  {
    value: "once",
    label: "One Time",
    description: "Run once at a specific time",
    icon: "🎯",
  },
  {
    value: "manual",
    label: "Manual Trigger",
    description: "Trigger manually only",
    icon: "👆",
  },
];

// Timezone Options
const TIMEZONES = [
  { value: "UTC", label: "UTC ⭐" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
];

// Common Cron Examples
const CRON_EXAMPLES = [
  { expression: "0 */1 * * *", description: "Every hour" },
  { expression: "0 0 * * *", description: "Daily at midnight" },
  { expression: "0 0 * * 0", description: "Weekly on Sunday" },
  { expression: "0 0 1 * *", description: "Monthly on 1st" },
  { expression: "*/15 * * * *", description: "Every 15 minutes" },
];

export default function TimerStartConfigForm({
  initialValues,
  validate,
  onSubmit,
  onSave,
  onCancel,
  configData,
}: TimerStartConfigFormProps & { configData?: any; onSave?: any }) {
  const [activeTab, setActiveTab] = useState("basic");

  const defaultValues = {
    schedule_type: "interval",
    interval_seconds: 3600,
    cron_expression: "0 */1 * * *",
    scheduled_time: "",
    timezone: "UTC",
    enabled: true,
    trigger_data: "{}",
    ...(initialValues || configData),
  };

  const actualOnSubmit = onSubmit || onSave;

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={defaultValues}
        enableReinitialize
        validate={validate}
        onSubmit={(values, { setSubmitting }) => {
          console.log("TimerStart form submitting with values:", values);
          try {
            const parsedValues = {
              ...values,
              trigger_data: values.trigger_data
                ? JSON.parse(values.trigger_data)
                : {},
            };
            console.log("TimerStart parsed values:", parsedValues);
            if (typeof actualOnSubmit === 'function') {
              actualOnSubmit(parsedValues);
            } else {
              console.error("actualOnSubmit is not a function:", actualOnSubmit);
            }
          } catch (error) {
            console.error("Error in TimerStart onSubmit:", error);
          }
          setSubmitting(false);
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form className="space-y-8 w-full p-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
              {[
                { id: "basic", label: "Basic", icon: Settings },
                { id: "advanced", label: "Advanced", icon: Zap },
                { id: "data", label: "Data", icon: Code },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1 rounded text-xs
                    transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Basic Configuration Tab */}
            {activeTab === "basic" && (
              <div className="space-y-6">
                {/* Schedule Type Selection */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <label className="text-white text-sm font-medium">
                      Schedule Type
                    </label>
                  </div>

                  <Field
                    as="select"
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                      text-white px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 
                      focus:ring-orange-500/20 transition-all"
                    name="schedule_type"
                  >
                    {SCHEDULE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </Field>
                  <div className="mt-1 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                    {
                      SCHEDULE_TYPES.find(
                        (t) => t.value === values.schedule_type
                      )?.description
                    }
                  </div>
                </div>

                {/* Interval Settings */}
                {values.schedule_type === "interval" && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Repeat className="w-4 h-4 text-blue-400" />
                      <label className="text-white text-sm font-medium">
                        Interval Settings
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-xs mb-2 block">
                        Interval:{" "}
                        <span className="text-blue-400 font-mono">
                          {values.interval_seconds}s
                        </span>
                        <span className="text-slate-400 ml-1">
                          ({Math.round(values.interval_seconds / 60)} min)
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                          [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="interval_seconds"
                        min="60"
                        max="86400"
                        step="60"
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        Min: 1 min, Max: 1 day
                      </div>
                    </div>
                  </div>
                )}

                {/* Cron Expression */}
                {values.schedule_type === "cron" && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Hash className="w-4 h-4 text-purple-400" />
                      <label className="text-white text-sm font-medium">
                        Cron Expression
                      </label>
                    </div>

                    <Field
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                        text-white placeholder-slate-400 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 
                        focus:ring-purple-500/20 transition-all font-mono"
                      name="cron_expression"
                      placeholder="0 */1 * * *"
                    />
                    <div className="text-xs text-slate-400 mt-1">
                      Format: minute hour day month weekday
                    </div>

                    {/* Cron Examples */}
                    <div className="mt-2 p-2 bg-slate-900/30 rounded border border-slate-600/30">
                      <div className="text-xs text-slate-300 mb-1">
                        Examples:
                      </div>
                      <div className="space-y-1">
                        {CRON_EXAMPLES.slice(0, 3).map((example, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 text-xs"
                          >
                            <code className="text-purple-400 font-mono text-xs">
                              {example.expression}
                            </code>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-xs">
                              {example.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Scheduled Time */}
                {values.schedule_type === "once" && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <CalendarDays className="w-4 h-4 text-green-400" />
                      <label className="text-white text-sm font-medium">
                        Scheduled Time
                      </label>
                    </div>

                    <Field
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                        text-white placeholder-slate-400 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 
                        focus:ring-green-500/20 transition-all"
                      type="datetime-local"
                      name="scheduled_time"
                    />
                    <div className="text-xs text-slate-400 mt-1">
                      ISO format datetime for one-time execution
                    </div>
                  </div>
                )}

                {/* Timezone Selection */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <label className="text-white text-sm font-medium">
                      Timezone
                    </label>
                  </div>

                  <Field
                    as="select"
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                      text-white px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 
                      focus:ring-cyan-500/20 transition-all"
                    name="timezone"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </Field>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === "advanced" && (
              <div className="space-y-6">
                {/* Timer Status */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <label className="text-white text-sm font-medium">
                      Timer Status
                    </label>
                  </div>

                  <ToggleField
                    name="enabled"
                    icon={
                      values.enabled ? (
                        <Play className="w-3 h-3" />
                      ) : (
                        <Pause className="w-3 h-3" />
                      )
                    }
                    label="Enable Timer"
                    description="Enable or disable the timer trigger"
                  />

                  <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertCircle className="w-3 h-3 text-emerald-400" />
                      <span className="text-slate-300 text-xs font-medium">
                        Guidelines
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>• Disabled timers won't trigger workflows</div>
                      <div>• Enable only when ready to run</div>
                      <div>• Monitor timer performance</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === "data" && (
              <div className="space-y-6">
                {/* Trigger Data Configuration */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Code className="w-4 h-4 text-purple-400" />
                    <label className="text-white text-sm font-medium">
                      Trigger Data
                    </label>
                  </div>

                  <Field
                    as="textarea"
                    className="w-full h-20 bg-slate-900/80 border border-slate-600/50 rounded-lg 
                      text-white placeholder-slate-400 px-3 py-2 text-xs focus:border-purple-500 focus:ring-2 
                      focus:ring-purple-500/20 transition-all resize-none font-mono"
                    name="trigger_data"
                    placeholder='{"message": "Timer triggered"}'
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    Data to pass when timer triggers (JSON format)
                  </div>

                  {/* Example Data */}
                  <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span className="text-slate-300 text-xs font-medium">
                        Example
                      </span>
                    </div>
                    <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
                      {`{
  "message": "Timer triggered",
  "timestamp": "2024-01-01T12:00:00Z"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            )}

          </Form>
        )}
      </Formik>
    </div>
  );
}

// Toggle Field Component
const ToggleField = ({
  name,
  icon,
  label,
  description,
}: {
  name: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
}) => (
  <Field name={name}>
    {({ field }: any) => (
      <div className="flex items-center justify-between p-2 bg-slate-900/30 rounded border border-slate-600/20">
        <div className="flex items-center space-x-2">
          <div className="text-slate-400">{icon}</div>
          <div>
            <div className="text-white text-xs font-medium">{label}</div>
            {description && (
              <div className="text-slate-400 text-xs">{description}</div>
            )}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            {...field}
            type="checkbox"
            checked={field.value}
            className="sr-only peer"
          />
          <div
            className="w-8 h-4 bg-slate-600 peer-focus:outline-none rounded-full peer 
            peer-checked:after:translate-x-full peer-checked:after:border-white 
            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
            after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all 
            peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-600"
          ></div>
        </label>
      </div>
    )}
  </Field>
);
