// TimerStartNode types.ts

export interface TimerStartData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  schedule_type?: "interval" | "cron" | "once" | "manual";
  interval_seconds?: number;
  cron_expression?: string;
  scheduled_time?: string;
  timezone?: string;
  enabled?: boolean;
  trigger_data?: any;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  timer_status?: "initialized" | "running" | "stopped" | "error" | "completed";
  is_active?: boolean;
  
  // Metrics
  execution_count?: number;
  next_execution?: string;
  last_execution?: string;
  countdown?: number;
  
  // Activity
  timer_id?: string;
  error_message?: string;
}

export interface TimerStartConfigFormProps {
  initialValues: Partial<TimerStartData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface TimerStartVisualProps {
  data: TimerStartData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface TimerStartNodeProps {
  data: TimerStartData;
  id: string;
}
