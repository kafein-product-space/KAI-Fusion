import React, { useEffect } from "react";
import { Calendar, TrendingUp, Activity, Zap } from "lucide-react";
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

  // Helper function to format runtime with ms precision
  const formatRuntime = (ms: number): string => {
    if (ms === 0) return "0s";

    if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)} s`;
    }

    const minutes = Math.floor(ms / 60000);
    const remainingMs = ms % 60000;
    const seconds = (remainingMs / 1000).toFixed(2);
    return `${minutes}m ${seconds} s`;
  };

  // Prepare chart data for DashboardChart
  const periodData =
    dashboardStats?.[selectedPeriod as keyof typeof dashboardStats];
  const chartData = Array.isArray(periodData)
    ? periodData.map((d: any) => ({
      name: d.date,
      prodexec: d.prodexec,
      failedprod: d.failedprod,
      avg_runtime_ms: d.avg_runtime_ms,
    }))
    : [];

  const chartConfig = {
    prodexec: {
      label: "Production executions",
      tooltipLabel: "Production executions",
      color: "var(--kai-accent)",
    },
    failedprod: {
      label: "Failed executions",
      tooltipLabel: "Failed executions",
      color: "var(--kai-danger-strong)",
    },
    avg_runtime_ms: {
      label: "Average runtime",
      tooltipLabel: "Average runtime",
      color: "var(--kai-success-strong)",
    },
  };

  return (
    <div className="flex h-screen bg-[var(--kai-bg)] text-zinc-100">
      <DashboardSidebar />

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 border-b border-[var(--kai-border)] pb-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5">
                <div className="min-w-0">
                  <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-zinc-100">Dashboard</h1>
                  <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                    Monitor workflow activity, execution health, and runtime trends.
                  </p>
                </div>
                <div className="relative justify-self-end">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                    <select
                      aria-label="Dashboard period"
                      className="h-9 rounded-lg border border-[var(--kai-input-border)] bg-[var(--kai-input-bg)] pl-9 pr-8 text-xs text-zinc-200 outline-none focus:border-[var(--kai-accent)] focus:ring-2 focus:ring-[var(--kai-accent)]/15"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                      <option value="7days">Last 7 days</option>
                      <option value="30days">Last 30 days</option>
                      <option value="90days">Last 90 days</option>
                    </select>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loading size="sm" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                {error}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-[var(--kai-border)] bg-[var(--kai-surface)] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500">Total executions</p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
                          {chartData.reduce(
                            (sum, item) => sum + (item.prodexec || 0),
                            0
                          )}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--kai-accent)]/15 text-[var(--kai-accent-text)]">
                        <Activity className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--kai-border)] bg-[var(--kai-surface)] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500">Failed executions</p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
                          {chartData.reduce(
                            (sum, item) => sum + (item.failedprod || 0),
                            0
                          )}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                        <Zap className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--kai-border)] bg-[var(--kai-surface)] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500">Success rate</p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
                          {(() => {
                            const total = chartData.reduce(
                              (sum, item) => sum + (item.prodexec || 0),
                              0
                            );
                            const failed = chartData.reduce(
                              (sum, item) => sum + (item.failedprod || 0),
                              0
                            );
                            return total > 0
                              ? Math.round(((total - failed) / total) * 100)
                              : 0;
                          })()}
                          %
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--kai-border)] bg-[var(--kai-surface)] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500">Average runtime</p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
                          {(() => {
                            const completedDays = chartData.filter(
                              (d) => (d as any).avg_runtime_ms > 0
                            );
                            if (completedDays.length === 0) return "0ms";
                            const avg =
                              completedDays.reduce(
                                (sum, d: any) => sum + (d.avg_runtime_ms || 0),
                                0
                              ) / completedDays.length;
                            return formatRuntime(avg);
                          })()}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--kai-accent)]/15 text-[var(--kai-accent-text)]">
                        <Calendar className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>

                <DashboardChart
                  title="Production Executions & Avg Runtime"
                  description={
                    selectedPeriod === "7days"
                      ? "Last 7 days"
                      : selectedPeriod === "30days"
                        ? "Last 30 days"
                        : "Last 90 days"
                  }
                  data={chartData}
                  dataKeys={["prodexec", "failedprod", "avg_runtime_ms"]}
                  config={chartConfig}
                />
              </div>
            )}
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
