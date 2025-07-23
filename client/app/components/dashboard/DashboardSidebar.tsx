import {
  Play,
  BarChart2,
  Key,
  Database,
  Layers,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Warehouse,
} from "lucide-react";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "~/stores/auth";
import { useThemeStore } from "~/stores/theme";
import { ThemeToggle } from "../common/ThemeToggle";

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const router = useNavigate();
  const mode = useThemeStore((s) => s.mode);

  // Close dropdown when clicking outside

  const handleLogOut = async () => {
    try {
      router("/signin"); // Önce yönlendir
      await signOut(); // Sonra logout işlemini başlat
    } catch (error) {
      console.error("Logout failed:", error);
      router("/signin"); // Hata olsa bile yönlendir
    }
  };

  return (
    <aside className="w-64 p-4 flex flex-col justify-between bg-background text-foreground border-r border-gray-300 dark:border-gray-700 transition-colors duration-300">
      {/* Theme Toggle */}
      <div>
        <div className="flex justify-start">
          <ThemeToggle />
        </div>
        {/* Logo */}
        <div className="font-bold text-xl mb-8">
          <Link to="/">
            <img src="/logo.png" alt="logo" />
          </Link>
        </div>
        {/* Ana Linkler */}
        <nav className="flex-1 px-1 py-2 overflow-y-auto">
          <ul className="space-y-1.5">
            <SidebarLink
              icon={<Play className="w-5 h-5" />}
              label="Workflows"
              path="/workflows"
              active={location.pathname === "/workflows"}
            />
            <SidebarLink
              icon={<BarChart2 className="w-6 h-6" />}
              label="Executions"
              path="/executions"
              active={location.pathname === "/executions"}
            />
            <SidebarLink
              icon={<Key className="w-6 h-6" />}
              label="Credentials"
              path="/credentials"
              active={location.pathname === "/credentials"}
            />
            <SidebarLink
              icon={<Warehouse className="w-6 h-6" />}
              label="Marketplace"
              path="/marketplace"
              active={location.pathname === "/marketplace"}
            />
            <SidebarLink
              icon={<Database className="w-6 h-6" />}
              label="Variables"
              path="/variables"
              active={location.pathname === "/variables"}
            />
          </ul>
        </nav>
      </div>
      {/* Profil ve logout bölümü */}
      <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-lg font-bold text-primary-foreground">
            {user?.full_name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all mt-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
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
}: {
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
}) {
  return (
    <Link
      to={path}
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200
        ${
          active
            ? "bg-purple-100 text-foreground font-semibold dark:bg-purple-700 dark:text-white"
            : "text-muted-foreground hover:text-foreground hover:bg-purple-100  dark:hover:!bg-purple-700 dark:hover:text-white"
        }
      `}
    >
      <span className="flex items-center justify-center min-w-[24px]">
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}
