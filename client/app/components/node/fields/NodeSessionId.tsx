import { useCallback, useEffect, useState } from "react";
import { Field } from "formik";
import type { NodeProperty } from "../types";
import { getActiveSessionId } from "../../../services/chatService";
import { useWorkflows } from "../../../stores/workflows";
import { useExecutionsStore } from "../../../stores/executions";
import { useClipboardFeedback } from "../../../hooks/useClipboardFeedback";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";

interface NodeSessionIdProps {
    property: NodeProperty;
    values: Record<string, unknown>;
    nodeId?: string;
}

export const NodeSessionId = ({ property, values, nodeId }: NodeSessionIdProps) => {
    const { currentWorkflow } = useWorkflows();
    const executionSessionId = useExecutionsStore(state => {
        const value = currentWorkflow?.id
            ? state.currentExecutions[currentWorkflow.id]?.result?.session_id
            : undefined;
        return typeof value === "string" ? value : undefined;
    });
    const { copy } = useClipboardFeedback();
    const isAutomatic = values.session_mode === "automatic" || values.session_mode === "auto";
    const previewScope = `${currentWorkflow?.id ?? ""}/${nodeId ?? ""}/${executionSessionId ?? ""}`;
    const [preview, setPreview] = useState<{ scope: string; sessionId: string } | null>(null);
    const sessionId = isAutomatic
        ? (preview?.scope === previewScope ? preview.sessionId : "")
        : String(values[property.name] ?? "");

    // Check if we need to fetch the active session ID (only in automatic mode)
    useEffect(() => {
        if (isAutomatic && currentWorkflow?.id && nodeId) {
            let active = true;
            getActiveSessionId(currentWorkflow.id, nodeId, executionSessionId).then(response => {
                if (active && response?.session_id) {
                    setPreview({ scope: previewScope, sessionId: response.session_id });
                }
            }).catch(err => {
                console.error("Failed to fetch active session ID:", err);
            });
            return () => { active = false; };
        }
    }, [isAutomatic, currentWorkflow?.id, nodeId, previewScope, executionSessionId]);

    const handleCopy = useCallback(() => {
        void copy(sessionId);
    }, [copy, sessionId]);

    return (
        <div
            className={`${property?.colSpan ? `col-span-${property?.colSpan}` : "col-span-2"
                }`}
            key={property.name}
        >
            <FieldLabel
                label={property.displayName}
                helpText={getFieldHelpText(property)}
            />
            <div className="flex items-center gap-2">
                <Field
                    name={property.name}
                    type="text"
                    value={sessionId}
                    readOnly={isAutomatic}
                    required={!isAutomatic}
                    className={`kai-node-field-control px-4 py-3 ${isAutomatic ? "cursor-default" : ""}`}
                    placeholder={property.placeholder || (isAutomatic ? "Automatically generated..." : "Enter manual session ID...")}
                />
                {isAutomatic && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!sessionId}
                        aria-label="Copy session ID to clipboard"
                        className="kai-node-field-action shrink-0 px-3 py-2 text-xs font-medium"
                    >
                        Copy
                    </button>
                )}
            </div>
        </div>
    );
};
