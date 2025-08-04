import {
  Play,
  BarChart2,
  Key,
  Database,
  LogOut,
  Store,
  Sparkles,
  Zap,
  Settings,
  User,
  Bell,
  Search,
} from "lucide-react";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "~/stores/auth";
import { useThemeStore } from "~/stores/theme";
import { ThemeToggle } from "../common/ThemeToggle";
import { useSnackbar } from "notistack";

const Sidebar = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const router = useNavigate();
  const mode = useThemeStore((s) => s.mode);

  const handleLogOut = async () => {
    try {
      await signOut();
      router("/signin");
      enqueueSnackbar("Başarıyla çıkış yapıldı", {
        variant: "success",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      enqueueSnackbar("Çıkış yapılırken hata oluştu", {
        variant: "error",
      });
      router("/signin");
    }
  };

  return (
    <aside className="w-72 h-screen p-4 flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white border-r border-slate-700/50 transition-all duration-300 ease-in-out backdrop-blur-sm shadow-2xl">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
              <img src="/logo.png" alt="logo" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                KAI-Fusion
              </h1>
              <p className="text-xs text-slate-400">AI Workflow Platform</p>
            </div>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Workflow ara..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          <div className="space-y-2">
            <SidebarLink
              icon={<Play className="w-5 h-5" />}
              label="Workflows"
              path="/workflows"
              active={location.pathname === "/workflows"}
              badge="New"
            />
            <SidebarLink
              icon={<BarChart2 className="w-5 h-5" />}
              label="Executions"
              path="/executions"
              active={location.pathname === "/executions"}
            />
            <SidebarLink
              icon={<Key className="w-5 h-5" />}
              label="Credentials"
              path="/credentials"
              active={location.pathname === "/credentials"}
            />
            <SidebarLink
              icon={<Store className="w-5 h-5" />}
              label="Marketplace"
              path="/marketplace"
              active={location.pathname === "/marketplace"}
              badge="Hot"
            />

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent my-4" />

            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quick Actions
              </h3>
              <SidebarLink
                icon={<Zap className="w-5 h-5" />}
                label="New Workflow"
                path="/canvas"
                active={false}
                variant="action"
              />
            </div>
          </div>
        </nav>
      </div>

      {/* Footer Section */}
      <div className="space-y-4">
        {/* Notifications */}
        <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-300">3 new updates</span>
            </div>
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          </div>
        </div>

        {/* User Profile */}
        <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-600/30">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-800" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || "Kullanıcı"}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>

            <button className="p-1 rounded-lg hover:bg-slate-700/50 transition-all duration-200">
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogOut}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span className="text-sm font-medium">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

function SidebarLink({
  icon,
  label,
  path,
  active,
  badge,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  badge?: string;
  variant?: "default" | "action";
}) {
  const getVariantStyles = () => {
    if (variant === "action") {
      return active
        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30"
        : "text-slate-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:text-blue-300";
    }

    return active
      ? "bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-white border border-slate-500/50"
      : "text-slate-300 hover:bg-slate-700/50 hover:text-white";
  };

  return (
    <Link
      to={path}
      className={`
        flex items-center space-x-3 px-3 py-2.5 rounded-lg 
        transition-all duration-200 group relative
        ${getVariantStyles()}
      `}
    >
      <span className="flex items-center justify-center min-w-[20px] group-hover:scale-110 transition-transform duration-200">
        {icon}
      </span>

      <span className="text-sm font-medium flex-1">{label}</span>
      {badge && (
        <span
          className={`
            px-2 py-0.5 text-xs font-bold rounded-full
            ${
              badge === "New"
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
            }
          `}
        >
          {badge}
        </span>
      )}

      {/* Active indicator */}
      {active && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full" />
      )}
    </Link>
  );
}
