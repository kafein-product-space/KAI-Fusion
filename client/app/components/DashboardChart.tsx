import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Chart configuration type
export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    tooltipLabel?: React.ReactNode;
    color?: string;
  };
};

// Chart data type
export interface ChartData {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

interface DashboardChartProps {
  title: string;
  description?: string;
  data: ChartData[];
  dataKeys: string[];
  config: ChartConfig;
  className?: string;
}

// Custom Tooltip for recharts
const CustomTooltip = ({ active, payload, label, dataKeys, config }: any) => {
  if (!active || !payload || !payload.length) return null;

  const formatValue = (key: string, value: any) => {
    if (typeof value !== "number") return value;
    if (key.includes("runtime") || key.includes("duration")) {
      if (value === 0) return "0s";
      if (value < 60000) {
        return `${(value / 1000).toFixed(2)} s`;
      }
      const minutes = Math.floor(value / 60000);
      const remainingMs = value % 60000;
      const seconds = (remainingMs / 1000).toFixed(2);
      return `${minutes}m ${seconds} s`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="relative z-[9999] min-w-[180px] rounded-lg border border-[var(--kai-border-muted)] bg-[var(--kai-surface-raised)] px-4 py-3 shadow-2xl">
      <div className="mb-2 text-xs font-semibold text-zinc-200">{label}</div>
      <div className="flex flex-col gap-1">
        {dataKeys.map((key: string) => {
          const entry = payload.find((p: any) => p.dataKey === key);
          if (!entry) return null;
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: config[key]?.color || "var(--kai-accent)" }}
              />
              <span className="text-xs text-zinc-500">
                {config[key]?.tooltipLabel || config[key]?.label || key}
              </span>
              <span className="ml-auto text-sm font-semibold text-zinc-200">
                {formatValue(key, entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DashboardChart: React.FC<DashboardChartProps> = ({
  title,
  description,
  data,
  dataKeys,
  config,
  className = "",
}) => {
  const [activeDataKey, setActiveDataKey] = React.useState<string>(dataKeys[0]);

  // Calculate total/average for each data key
  const totals = React.useMemo(() => {
    return dataKeys.reduce((acc, key) => {
      const isRuntime = key.includes("runtime") || key.includes("duration");

      if (isRuntime) {
        // Average for days that actually have runtime info
        const values = data
          .map(item => Number(item[key]) || 0)
          .filter(v => v > 0);
        acc[key] = values.length > 0
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0;
      } else {
        // Simple sum for counts
        acc[key] = data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
      }
      return acc;
    }, {} as Record<string, number>);
  }, [data, dataKeys]);

  const formatTotalValue = (key: string, value: number) => {
    if (key.includes("runtime") || key.includes("duration")) {
      if (value === 0) return "0s";
      if (value < 60000) {
        return `${(value / 1000).toFixed(2)} s`;
      }
      const minutes = Math.floor(value / 60000);
      const remainingMs = value % 60000;
      const seconds = (remainingMs / 1000).toFixed(2);
      return `${minutes}m ${seconds} s`;
    }
    return value.toLocaleString();
  };

  return (
    <div
      className={`rounded-xl border border-[var(--kai-border)] bg-[var(--kai-surface)] ${className}`}
    >
      <div className="flex flex-col gap-4 border-b border-[var(--kai-border)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-zinc-600">{description}</p>
          )}
        </div>
        <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-[var(--kai-bg)] p-1 lg:ml-auto">
          {dataKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveDataKey(key)}
              className={`min-w-[132px] rounded-md border border-transparent px-3 py-2 text-left text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--kai-accent)]/40 ${activeDataKey === key
                ? "bg-[var(--kai-border)] text-zinc-100"
                : "text-zinc-500 hover:bg-[var(--kai-surface-raised)] hover:text-zinc-200"
                }`}
            >
              <span>{config[key]?.label || key}</span>
              <span className={`mt-0.5 block text-[10px] font-normal ${activeDataKey === key ? "text-zinc-400" : "text-zinc-700"}`}>
                {formatTotalValue(key, totals[key])}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        <div className="h-72 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {dataKeys.map((key) => (
                  <linearGradient
                    key={key}
                    id={`gradient-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={config[key]?.color || "var(--kai-accent)"}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={config[key]?.color || "var(--kai-accent)"}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
            stroke="var(--kai-chart-grid)"
                opacity={0.75}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "var(--kai-neutral-focus)", fontSize: 11 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "short",
                  });
                }}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "var(--kai-neutral-focus)", fontSize: 11 }}
                orientation="left"
              />
              <YAxis
                yAxisId="right"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "var(--kai-neutral-focus)", fontSize: 11 }}
                orientation="right"
              />
              <Tooltip
                content={<CustomTooltip dataKeys={dataKeys} config={config} />}
                wrapperStyle={{ zIndex: 9999 }}
                cursor={{ fill: "var(--kai-accent)", opacity: 0.08 }}
                labelFormatter={(label) => {
                  const labelText = String(label ?? "");
                  const date = new Date(labelText);
                  if (Number.isNaN(date.getTime())) return labelText;
                  return date.toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                  });
                }}
              />
              {dataKeys.map((key) => {
                const isRuntime = key.includes("runtime") || key.includes("duration");
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    yAxisId={isRuntime ? "right" : "left"}
                    stroke={config[key]?.color || "var(--kai-accent)"}
                    fill={`url(#gradient-${key})`}
                    fillOpacity={activeDataKey === key ? 0.3 : 0.05}
                    strokeWidth={activeDataKey === key ? 3 : 1.5}
                    dot={{ r: 4, strokeWidth: 1, fill: config[key]?.color || "var(--kai-accent)", fillOpacity: activeDataKey === key ? 1 : 0.4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    opacity={activeDataKey === key ? 1 : 0.4}
                    isAnimationActive={false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardChart;
