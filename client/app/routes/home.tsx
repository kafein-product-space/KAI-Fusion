import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

export default function DashboardLayout() {
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

  // Dummy chart data generation
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

  return (
    <div className="flex h-screen w-screen">
      <DashboardSidebar />

      <main className="flex-1 p-10 m-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col items-start gap-4 justify-between mb-6">
            <h1 className="text-4xl font-medium text-start">Overview</h1>
            <p className="text-gray-600">
              Get an overview of your activity, recent executions, and system
              health at a glance.
            </p>

            <select
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm w-64 h-8"
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
                className={` cursor-pointer border rounded-t-lg p-4  transition-all text-start ${
                  selectedStat === stat.statKey
                    ? "border-gray-200 border-b-2 border-b-blue-500"
                    : "border-b border-gray-200"
                }`}
              >
                <div className="text-xs text-gray-600 mb-1 flex flex-col justify-start items-start">
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
          <div className="border border-gray-300 rounded-b-lg w-full h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
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
