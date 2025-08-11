// index.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import TimerStartConfigForm from "./TimerStartConfigForm";
import TimerStartVisual from "./TimerStartVisual";
import type { TimerStartData, TimerStartNodeProps } from "./types";

export default function TimerStartNode({ data, id }: TimerStartNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<TimerStartData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = useCallback(
    (values: Partial<TimerStartData>) => {
      try {
        // Update the node data
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...values } }
              : node
          )
        );

        // Update local config data for persistence
        setConfigData((prev) => ({ ...prev, ...values }));

        // Close config mode
        setIsConfigMode(false);
      } catch (error) {
        console.error("Error saving timer configuration:", error);
      }
    },
    [setNodes, id]
  );

  const handleCancel = useCallback(() => {
    setIsConfigMode(false);
  }, []);

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  // Validation function
  const validate = (values: Partial<TimerStartData>) => {
    const errors: any = {};

    if (!values.schedule_type) {
      errors.schedule_type = "Schedule type is required";
    }

    if (values.schedule_type === "interval") {
      if (!values.interval_seconds || values.interval_seconds < 60) {
        errors.interval_seconds = "Interval must be at least 60 seconds";
      }
      if (values.interval_seconds && values.interval_seconds > 86400) {
        errors.interval_seconds = "Interval cannot exceed 24 hours";
      }
    }

    if (values.schedule_type === "cron") {
      if (!values.cron_expression) {
        errors.cron_expression = "Cron expression is required";
      }
    }

    if (values.schedule_type === "once") {
      if (!values.scheduled_time) {
        errors.scheduled_time =
          "Scheduled time is required for one-time execution";
      }
    }

    if (!values.timezone) {
      errors.timezone = "Timezone is required";
    }

    // Validate trigger_data JSON
    if (values.trigger_data && typeof values.trigger_data === "string") {
      try {
        JSON.parse(values.trigger_data);
      } catch (error) {
        errors.trigger_data = "Invalid JSON format";
      }
    }

    return errors;
  };

  if (isConfigMode) {
    return (
      <TimerStartConfigForm
        initialValues={{
          schedule_type: configData.schedule_type || "interval",
          interval_seconds: configData.interval_seconds || 3600,
          cron_expression: configData.cron_expression || "0 */1 * * *",
          scheduled_time: configData.scheduled_time || "",
          timezone: configData.timezone || "UTC",
          enabled: configData.enabled !== false,
          trigger_data: configData.trigger_data
            ? JSON.stringify(configData.trigger_data, null, 2)
            : "{}",
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <TimerStartVisual
      data={data}
      isHovered={isHovered}
      onDoubleClick={() => setIsConfigMode(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDelete={handleDeleteNode}
      isHandleConnected={isHandleConnected}
    />
  );
}
