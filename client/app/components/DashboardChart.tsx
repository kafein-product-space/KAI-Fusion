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
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl px-4 py-3 min-w-[180px] z-[9999] relative">
      <div className="text-xs font-semibold text-gray-900 mb-2">{label}</div>
      <div className="flex flex-col gap-1">
        {dataKeys.map((key: string) => {
          const entry = payload.find((p: any) => p.dataKey === key);
          if (!entry) return null;
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: config[key]?.color || "#2563eb" }}
              />
              <span className="text-xs text-gray-600">
                {config[key]?.label || key}
              </span>
              <span className="ml-auto font-bold text-gray-900 text-sm">
                {typeof entry.value === "number"
                  ? entry.value.toLocaleString()
                  : entry.value}
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

  // Calculate total for each data key
  const totals = React.useMemo(() => {
    return dataKeys.reduce((acc, key) => {
      acc[key] = data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
      return acc;
    }, {} as Record<string, number>);
  }, [data, dataKeys]);

  return (
    <div
      className={`rounded-xl border border-gray-200  bg-background shadow-sm ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-200  px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex mt-2 md:mt-0">
          {dataKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveDataKey(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                activeDataKey === key
                  ? "bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-500 text-foreground"
              }`}
              style={{ marginLeft: key !== dataKeys[0] ? 8 : 0 }}
            >
              <span>{config[key]?.label || key}</span>
              <span className="block text-xs text-muted-foreground font-normal">
                {totals[key].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
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
                      stopColor={config[key]?.color || "#2563eb"}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={config[key]?.color || "#2563eb"}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                opacity={0.4}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "#6b7280" }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "short",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "#6b7280" }}
              />
              <Tooltip
                content={<CustomTooltip dataKeys={dataKeys} config={config} />}
                wrapperStyle={{ zIndex: 9999 }}
                cursor={{ fill: "#2563eb", opacity: 0.08 }}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                  });
                }}
              />
              {dataKeys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={config[key]?.color || "#2563eb"}
                  fill={`url(#gradient-${key})`}
                  fillOpacity={activeDataKey === key ? 1 : 0.2}
                  strokeWidth={activeDataKey === key ? 2 : 1}
                  opacity={activeDataKey === key ? 1 : 0.5}
                  isAnimationActive={true}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardChart;
