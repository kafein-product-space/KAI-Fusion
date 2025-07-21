import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AuthGuard from "~/components/AuthGuard";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";

// Types
interface StatData {
  prodexec: number;
  failedprod: number;
  failurerate: string;
  timesaved: string;
  runtime: string;
}

interface PeriodStats {
  [key: string]: StatData;
}

interface Stat {
  label: string;
  statKey: keyof StatData;
}

interface ChartData {
  name: string;
  value: number;
}

function DashboardLayout() {
  const [selectedStat, setSelectedStat] = useState<keyof StatData>("prodexec");
  const [selectedPeriod, setSelectedPeriod] = useState("7days");

  const statsData: PeriodStats = {
    "7days": {
      prodexec: 150,
      failedprod: 12,
      failurerate: "8%",
      timesaved: "45h",
      runtime: "3h",
    },
    "30days": {
      prodexec: 650,
      failedprod: 45,
      failurerate: "7%",
      timesaved: "180h",
      runtime: "12h",
    },
    "90days": {
      prodexec: 1800,
      failedprod: 120,
      failurerate: "6.7%",
      timesaved: "540h",
      runtime: "36h",
    },
  };

  const stats: Stat[] = [
    { label: "Prod. executions", statKey: "prodexec" },
    { label: "Failed Prod. executions", statKey: "failedprod" },
    { label: "Failure Rate", statKey: "failurerate" },
    { label: "Time Saved", statKey: "timesaved" },
    { label: "Run time", statKey: "runtime" },
  ];

  const generateChartData = (): ChartData[] => {
    const rawValue = statsData[selectedPeriod][selectedStat];
    const baseValue =
      typeof rawValue === "string"
        ? parseFloat(rawValue.replace(/[^0-9.]/g, ""))
        : rawValue;

    return Array.from({ length: 7 }, (_, i) => ({
      name: `Day ${i + 1}`,
      value: Math.round(baseValue / 7 + Math.random() * 10),
    }));
  };

  const chartData = generateChartData();
  const isDarkMode =
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />

      <main className="flex-1 p-10 m-10 bg-background">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col items-start gap-4 justify-between mb-6">
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="text-4xl font-medium text-start">Overview</h1>
                <p className="text-muted-foreground">
                  Get an overview of your activity, recent executions, and
                  system health at a glance.
                </p>
              </div>
            </div>

            <select
              className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#23272f] text-sm w-64 h-8 rounded-lg px-3 py-1 text-black dark:text-gray-100"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 cursor-pointer">
            {stats.map((stat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedStat(stat.statKey)}
                className={`cursor-pointer border rounded-t-lg p-4 transition-all text-start bg-white dark:bg-[#23272f] text-black dark:text-gray-100 ${
                  selectedStat === stat.statKey
                    ? "border-gray-200 dark:border-gray-600 border-b-2 border-b-blue-500 dark:border-b-blue-400"
                    : "border-b border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                  {stat.label} <br />
                  {selectedPeriod === "7days"
                    ? "Last 7 days"
                    : selectedPeriod === "30days"
                    ? "Last 30 days"
                    : "Last 90 days"}
                </div>
                <div className="text-2xl font-bold">
                  {statsData[selectedPeriod][stat.statKey]}
                </div>
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="border border-gray-300 dark:border-gray-700 rounded-b-lg w-full h-64 p-4 bg-white dark:bg-[#23272f]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="name"
                  stroke={isDarkMode ? "#ccc" : "#888"}
                  tick={{ fill: isDarkMode ? "#ccc" : "#888" }}
                  tickLine={{ stroke: isDarkMode ? "#ccc" : "#888" }}
                  axisLine={{ stroke: isDarkMode ? "#ccc" : "#888" }}
                />
                <YAxis
                  stroke={isDarkMode ? "#ccc" : "#888"}
                  tick={{ fill: isDarkMode ? "#ccc" : "#888" }}
                  tickLine={{ stroke: isDarkMode ? "#ccc" : "#888" }}
                  axisLine={{ stroke: isDarkMode ? "#ccc" : "#888" }}
                />
                <Tooltip
                  contentStyle={{
                    background: isDarkMode ? "#1f2937" : "#fff",
                    color: isDarkMode ? "#fff" : "#000",
                    border: "1px solid #444",
                  }}
                  itemStyle={{
                    color: isDarkMode ? "#fff" : "#000",
                  }}
                  labelStyle={{
                    color: isDarkMode ? "#fff" : "#000",
                  }}
                  wrapperStyle={{ zIndex: 50 }}
                  cursor={{ fill: isDarkMode ? "#fff" : "#333", opacity: 0.05 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProtectedDashboardLayout() {
  return (
    <AuthGuard>
      <DashboardLayout />
    </AuthGuard>
  );
}
