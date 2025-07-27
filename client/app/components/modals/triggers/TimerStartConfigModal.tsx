import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";

interface TimerStartConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface TimerStartConfig {
  schedule_type: string;
  interval_seconds: number;
  cron_expression: string;
  scheduled_time: string;
  timezone: string;
  enabled: boolean;
  trigger_data: string;
}

// Schedule Type Options
const SCHEDULE_TYPES = [
  {
    value: "interval",
    label: "Interval",
    description: "Run at regular intervals (e.g., every hour)",
  },
  {
    value: "cron",
    label: "Cron Expression",
    description: "Use cron expression for complex scheduling",
  },
  {
    value: "once",
    label: "Once",
    description: "Run once at a specific time",
  },
  {
    value: "manual",
    label: "Manual",
    description: "Trigger manually only",
  },
];

// Timezone Options
const TIMEZONES = [
  { value: "UTC", label: "UTC" },
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

const TimerStartConfigModal = forwardRef<
  HTMLDialogElement,
  TimerStartConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: TimerStartConfig = {
    schedule_type: nodeData?.schedule_type || "interval",
    interval_seconds: nodeData?.interval_seconds || 3600,
    cron_expression: nodeData?.cron_expression || "0 */1 * * *",
    scheduled_time: nodeData?.scheduled_time || "",
    timezone: nodeData?.timezone || "UTC",
    enabled: nodeData?.enabled !== false,
    trigger_data: nodeData?.trigger_data
      ? JSON.stringify(nodeData.trigger_data, null, 2)
      : "{}",
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-2">Timer Start Ayarları</h3>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={(values, { setSubmitting }) => {
            // Parse trigger_data back to object
            const parsedValues = {
              ...values,
              trigger_data: values.trigger_data
                ? JSON.parse(values.trigger_data)
                : {},
            };
            onSave(parsedValues);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values }) => (
            <Form className="space-y-4 mt-4">
              {/* Schedule Type */}
              <div className="form-control">
                <label className="label">Schedule Type</label>
                <Field
                  as="select"
                  className="select select-bordered w-full"
                  name="schedule_type"
                >
                  {SCHEDULE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Field>
                <div className="text-xs text-gray-500 mt-1">
                  {
                    SCHEDULE_TYPES.find((t) => t.value === values.schedule_type)
                      ?.description
                  }
                </div>
              </div>

              {/* Interval Settings (only for interval type) */}
              {values.schedule_type === "interval" && (
                <div className="form-control">
                  <label className="label">
                    Interval: {values.interval_seconds} seconds (
                    {Math.round(values.interval_seconds / 60)} minutes)
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="interval_seconds"
                    min="60"
                    max="86400"
                    step="60"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Minimum: 1 minute, Maximum: 1 day
                  </div>
                </div>
              )}

              {/* Cron Expression (only for cron type) */}
              {values.schedule_type === "cron" && (
                <div className="form-control">
                  <label className="label">Cron Expression</label>
                  <Field
                    className="input input-bordered w-full"
                    name="cron_expression"
                    placeholder="0 */1 * * *"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Format: minute hour day month weekday (e.g., "0 */1 * * *" =
                    every hour)
                  </div>
                </div>
              )}

              {/* Scheduled Time (only for once type) */}
              {values.schedule_type === "once" && (
                <div className="form-control">
                  <label className="label">Scheduled Time</label>
                  <Field
                    className="input input-bordered w-full"
                    type="datetime-local"
                    name="scheduled_time"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    ISO format datetime for one-time execution
                  </div>
                </div>
              )}

              {/* Timezone */}
              <div className="form-control">
                <label className="label">Timezone</label>
                <Field
                  as="select"
                  className="select select-bordered w-full"
                  name="timezone"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </Field>
                <div className="text-xs text-gray-500 mt-1">
                  Timezone for schedule calculations
                </div>
              </div>

              {/* Trigger Data */}
              <div className="form-control">
                <label className="label">Trigger Data (JSON)</label>
                <Field
                  as="textarea"
                  className="textarea textarea-bordered w-full h-24"
                  name="trigger_data"
                  placeholder='{"message": "Timer triggered", "data": {}}'
                />
                <div className="text-xs text-gray-500 mt-1">
                  Data to pass when timer triggers (JSON format)
                </div>
              </div>

              {/* Enable/Disable */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Enable Timer</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="enabled"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Enable or disable the timer
                </div>
              </div>

              {/* Schedule Information */}
              <div className="alert alert-info">
                <div>
                  <h4 className="font-bold">Schedule Information</h4>
                  <div className="text-xs mt-1">
                    <strong>Interval:</strong> Regular intervals •{" "}
                    <strong>Cron:</strong> Complex scheduling •{" "}
                    <strong>Once:</strong> One-time execution •{" "}
                    <strong>Manual:</strong> Manual trigger only
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default TimerStartConfigModal;
