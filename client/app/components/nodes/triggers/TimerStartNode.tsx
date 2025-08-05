import React, { useRef, useState, useEffect } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import {
  Clock,
  Trash,
  Zap,
  Activity,
  Calendar,
  Timer,
  Play,
  Repeat,
  Square,
  Radio,
  CheckCircle,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Timer as TimerIcon,
} from "lucide-react";
import TimerStartConfigModal from "~/components/modals/triggers/TimerStartConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface TimerStartNodeProps {
  data: any;
  id: string;
}

interface TimerStatus {
  timer_id: string;
  status: "initialized" | "running" | "stopped" | "error" | "completed";
  next_execution?: string;
  last_execution?: string;
  execution_count: number;
  is_active: boolean;
}

interface TimerExecution {
  execution_id: string;
  triggered_at: string;
  status: "success" | "failed" | "timeout" | "retry";
  duration_ms: number;
  error_message?: string;
  retry_count?: number;
}

function TimerStartNode({ data, id }: TimerStartNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timerStatus, setTimerStatus] = useState<TimerStatus | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [executions, setExecutions] = useState<TimerExecution[]>([]);
  const modalRef = useRef<HTMLDialogElement>(null);

  // Real-time countdown to next execution
  useEffect(() => {
    if (!timerStatus?.next_execution || !isActive) return;

    const interval = setInterval(() => {
      const next = new Date(timerStatus.next_execution!);
      const now = new Date();
      const diff = Math.max(
        0,
        Math.floor((next.getTime() - now.getTime()) / 1000)
      );
      setCountdown(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStatus, isActive]);

  // Timer status güncelleme
  useEffect(() => {
    if (data?.timer_id) {
      fetchTimerStatus();
    }
  }, [data?.timer_id]);

  const fetchTimerStatus = async () => {
    try {
      const response = await fetch(`/api/timers/${data.timer_id}/status`);
      if (response.ok) {
        const status = await response.json();
        setTimerStatus(status);
        setIsActive(status.is_active);
      }
    } catch (err) {
      console.error("Failed to fetch timer status:", err);
    }
  };

  const startTimer = async () => {
    try {
      const response = await fetch(`/api/timers/${data.timer_id}/start`, {
        method: "POST",
      });

      if (response.ok) {
        setIsActive(true);
        fetchTimerStatus();
      }
    } catch (err) {
      console.error("Failed to start timer:", err);
    }
  };

  const stopTimer = async () => {
    try {
      const response = await fetch(`/api/timers/${data.timer_id}/stop`, {
        method: "POST",
      });

      if (response.ok) {
        setIsActive(false);
        fetchTimerStatus();
      }
    } catch (err) {
      console.error("Failed to stop timer:", err);
    }
  };

  const triggerNow = async () => {
    try {
      const response = await fetch(`/api/timers/${data.timer_id}/trigger`, {
        method: "POST",
      });

      if (response.ok) {
        // Refresh status after manual trigger
        fetchTimerStatus();
      }
    } catch (err) {
      console.error("Failed to trigger timer:", err);
    }
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleOpenModal = () => {
    modalRef.current?.showModal();
  };

  const handleConfigSave = (newConfig: any) => {
    setNodes((nodes: any[]) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newConfig } }
          : node
      )
    );
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    if (isActive) return "from-green-500 to-emerald-600";
    if (timerStatus?.status === "error") return "from-red-500 to-rose-600";
    if (timerStatus?.status === "completed") return "from-blue-500 to-cyan-600";

    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-green-500 to-emerald-600";
    }
  };

  const getGlowColor = () => {
    if (isActive) return "shadow-green-500/50";
    if (timerStatus?.status === "error") return "shadow-red-500/30";
    if (timerStatus?.status === "completed") return "shadow-blue-500/30";

    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-green-500/30";
    }
  };

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br ${getStatusColor()}
          ${
            isHovered
              ? `shadow-2xl ${getGlowColor()}`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Double click to configure"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <Clock className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Timer status indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
              {isActive ? (
                <Radio className="w-2 h-2 text-white animate-pulse" />
              ) : timerStatus?.status === "completed" ? (
                <CheckCircle className="w-2 h-2 text-white" />
              ) : (
                <Timer className="w-2 h-2 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Timer"}
        </div>

        {/* Timer status */}
        {isActive && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg animate-pulse">
              ⏰ RUNNING
            </div>
          </div>
        )}

        {/* Countdown display */}
        {isActive && countdown > 0 && (
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
              {formatCountdown(countdown)}
            </div>
          </div>
        )}

        {/* Hover effects */}
        {isHovered && (
          <>
            {/* Delete button */}
            <button
              className="absolute -top-3 -right-3 w-8 h-8 
                bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={handleDeleteNode}
              title="Delete Node"
            >
              <Trash size={14} />
            </button>

            {/* Timer control buttons */}
            <div className="absolute -bottom-3 -right-3 flex space-x-1">
              {!isActive ? (
                <button
                  className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 
                    hover:from-green-400 hover:to-green-500 text-white rounded-full 
                    border border-white/30 shadow-xl transition-all duration-200 
                    hover:scale-110 flex items-center justify-center z-20 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    startTimer();
                  }}
                  title="Start Timer"
                >
                  <Play size={14} />
                </button>
              ) : (
                <button
                  className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 
                    hover:from-red-400 hover:to-red-500 text-white rounded-full 
                    border border-white/30 shadow-xl transition-all duration-200 
                    hover:scale-110 flex items-center justify-center z-20 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopTimer();
                  }}
                  title="Stop Timer"
                >
                  <Square size={14} />
                </button>
              )}

              <button
                className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 
                  hover:from-blue-400 hover:to-blue-500 text-white rounded-full 
                  border border-white/30 shadow-xl transition-all duration-200 
                  hover:scale-110 flex items-center justify-center z-20 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerNow();
                }}
                title="Trigger Now"
              >
                <Zap size={14} />
              </button>
            </div>
          </>
        )}

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="timer_data"
          isConnectable={true}
          size={10}
          color1="#3b82f6"
          glow={isHandleConnected("timer_data", true)}
          style={{
            top: "20%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="schedule_info"
          isConnectable={true}
          size={10}
          color1="#8b5cf6"
          glow={isHandleConnected("schedule_info", true)}
          style={{
            top: "40%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="timer_stats"
          isConnectable={true}
          size={10}
          color1="#10b981"
          glow={isHandleConnected("timer_stats", true)}
          style={{
            top: "60%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="timer_control"
          isConnectable={true}
          size={10}
          color1="#f59e0b"
          glow={isHandleConnected("timer_control", true)}
          style={{
            top: "80%",
          }}
        />

        {/* Right side labels for outputs */}
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "15%" }}
        >
          Timer Data
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "35%" }}
        >
          Schedule
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "55%" }}
        >
          Stats
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "75%" }}
        >
          Control
        </div>

        {/* Timer Type Badge */}
        {data?.schedule_type && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg">
              {data.schedule_type}
            </div>
          </div>
        )}

        {/* Execution count badge */}
        {timerStatus?.execution_count > 0 && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-5 h-5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">
                {timerStatus.execution_count}
              </span>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {timerStatus?.status === "error" && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <AlertCircle className="w-2 h-2 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <TimerStartConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
        isActive={isActive}
        timerStatus={timerStatus}
        countdown={countdown}
        executions={executions}
        onStartTimer={startTimer}
        onStopTimer={stopTimer}
        onTriggerNow={triggerNow}
      />
    </>
  );
}

export default TimerStartNode;
