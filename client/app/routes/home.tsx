import React, { useState, useEffect } from "react";
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
import type { ChartConfig, ChartData } from "../components/DashboardChart";
import DashboardChart from "../components/DashboardChart";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useWorkflows } from "~/stores/workflows";

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

function DashboardLayout() {
  const [selectedStat, setSelectedStat] = useState<keyof StatData>("prodexec");
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const { dashboardStats, fetchDashboardStats, isLoading, error } =
    useWorkflows();

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  if (error || !dashboardStats) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-red-500">
        {error || "Veri yok"}
      </div>
    );
  }

  const statsData: Stat[] = [
    { label: "Prod. executions", statKey: "prodexec" },
    { label: "Failed Prod. executions", statKey: "failedprod" },
    { label: "Failure Rate", statKey: "failurerate" },
    { label: "Time Saved", statKey: "timesaved" },
    { label: "Run time", statKey: "runtime" },
  ];

  // Prepare chart data for DashboardChart
  const chartData: ChartData[] = Array.from({ length: 7 }, (_, i) => ({
    name: `Gün ${i + 1}`,
    prodexec: Math.round(
      (typeof dashboardStats[selectedPeriod]["prodexec"] === "string"
        ? parseFloat(dashboardStats[selectedPeriod]["prodexec"] as string)
        : dashboardStats[selectedPeriod]["prodexec"]) /
        7 +
        Math.random() * 10
    ),
    failedprod: Math.round(
      (typeof dashboardStats[selectedPeriod]["failedprod"] === "string"
        ? parseFloat(dashboardStats[selectedPeriod]["failedprod"] as string)
        : dashboardStats[selectedPeriod]["failedprod"]) /
        7 +
        Math.random() * 3
    ),
  }));

  const chartConfig: ChartConfig = {
    prodexec: {
      label: "Prod. executions",
      color: "#2563eb",
    },
    failedprod: {
      label: "Failed Prod. executions",
      color: "#ef4444",
    },
  };

  const isDarkMode =
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />

      <main className="flex-1 p-10 m-10 bg-background">
        {/* Stat Cards & Chart */}
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
              className="border border-gray-300 dark:border-gray-700 bg-background text-sm w-64 h-8 rounded-lg px-3 py-1 text-foreground"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>
          <DashboardChart
            title="Production Executions"
            description={
              selectedPeriod === "7days"
                ? "Last 7 days"
                : selectedPeriod === "30days"
                ? "Last 30 days"
                : "Last 90 days"
            }
            data={chartData}
            dataKeys={["prodexec", "failedprod"]}
            config={chartConfig}
            className="mt-4"
          />
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
