import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";

interface WebhookTriggerConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface WebhookTriggerConfig {
  authentication_required: boolean;
  allowed_event_types: string;
  max_payload_size: number;
  rate_limit_per_minute: number;
  enable_cors: boolean;
  webhook_timeout: number;
}

const WebhookTriggerConfigModal = forwardRef<
  HTMLDialogElement,
  WebhookTriggerConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: WebhookTriggerConfig = {
    authentication_required: nodeData?.authentication_required !== false,
    allowed_event_types: nodeData?.allowed_event_types || "",
    max_payload_size: nodeData?.max_payload_size || 1024,
    rate_limit_per_minute: nodeData?.rate_limit_per_minute || 60,
    enable_cors: nodeData?.enable_cors !== false,
    webhook_timeout: nodeData?.webhook_timeout || 30,
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-2">Webhook Trigger Ayarları</h3>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values }) => (
            <Form className="space-y-4 mt-4">
              {/* Authentication */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Authentication Required</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="authentication_required"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Require bearer token authentication for webhook calls
                </div>
              </div>

              {/* Allowed Event Types */}
              <div className="form-control">
                <label className="label">Allowed Event Types</label>
                <Field
                  className="input input-bordered w-full"
                  name="allowed_event_types"
                  placeholder="webhook.received,user.created,order.completed"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Comma-separated list of allowed event types (empty = all
                  allowed)
                </div>
              </div>

              {/* Payload Size and Rate Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    Max Payload Size: {values.max_payload_size} KB
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="max_payload_size"
                    min="1"
                    max="10240"
                    step="1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Maximum payload size in KB (1-10240)
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    Rate Limit: {values.rate_limit_per_minute} req/min
                  </label>
                  <Field
                    type="range"
                    className="range range-primary"
                    name="rate_limit_per_minute"
                    min="0"
                    max="1000"
                    step="10"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Maximum requests per minute (0 = no limit)
                  </div>
                </div>
              </div>

              {/* Timeout */}
              <div className="form-control">
                <label className="label">
                  Webhook Timeout: {values.webhook_timeout}s
                </label>
                <Field
                  type="range"
                  className="range range-primary"
                  name="webhook_timeout"
                  min="5"
                  max="300"
                  step="5"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Webhook processing timeout in seconds (5-300)
                </div>
              </div>

              {/* CORS */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Enable CORS</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="enable_cors"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Enable CORS for cross-origin requests
                </div>
              </div>

              {/* Webhook Information */}
              <div className="alert alert-info">
                <div>
                  <h4 className="font-bold">Webhook Information</h4>
                  <div className="text-xs mt-1">
                    <strong>Endpoint:</strong> POST to /api/webhooks/
                    {nodeData?.webhook_id || "webhook_id"} •{" "}
                    <strong>Auth:</strong> Bearer token required •{" "}
                    <strong>Format:</strong> JSON payload
                  </div>
                </div>
              </div>

              {/* Example Payload */}
              <div className="form-control">
                <label className="label">Example Webhook Payload</label>
                <div className="bg-gray-100 p-3 rounded-lg text-xs font-mono">
                  {`{
  "event_type": "webhook.received",
  "data": {
    "message": "Hello from webhook",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "source": "external-service",
  "correlation_id": "req_123456"
}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Standard webhook payload format
                </div>
              </div>

              {/* Security Information */}
              <div className="alert alert-warning">
                <div>
                  <h4 className="font-bold">Security Notes</h4>
                  <div className="text-xs mt-1">
                    • Keep webhook tokens secure • Validate payload size •
                    Monitor rate limits • Use HTTPS in production
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

export default WebhookTriggerConfigModal;
