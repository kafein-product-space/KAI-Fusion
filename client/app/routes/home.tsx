import React, { useEffect } from "react";
import AuthGuard from "~/components/AuthGuard";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import DashboardChart from "../components/DashboardChart";
import Loading from "../components/Loading";
import { useWorkflows } from "~/stores/workflows";

function DashboardLayout() {
  const [selectedPeriod, setSelectedPeriod] = React.useState("7days");
  const { dashboardStats, fetchDashboardStats, isLoading, error } =
    useWorkflows();

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prepare chart data for DashboardChart
  const periodData =
    dashboardStats?.[selectedPeriod as keyof typeof dashboardStats];
  const chartData = Array.isArray(periodData)
    ? periodData.map((d: any) => ({
        name: d.date,
        prodexec: d.prodexec,
        failedprod: d.failedprod,
      }))
    : [];

  const chartConfig = {
    prodexec: {
      label: "Prod. executions",
      color: "#2563eb",
    },
    failedprod: {
      label: "Failed Prod. executions",
      color: "#ef4444",
    },
  };

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
          {isLoading ? (
            <div className="flex justify-center items-center ">
              <Loading size="sm" />
            </div>
          ) : (
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
          )}
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
