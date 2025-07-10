import {
  Play,
  BarChart2,
  Key,
  Database,
  Layers,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router";

const Sidebar = () => {
  const location = useLocation();
  const router = useNavigate();

  const handleLogOut = () => {
    router("/signin");
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col justify-between">
      {/* Üst bölüm: logo + ana linkler */}
      <div>
        {/* Logo */}
        <div className="font-bold text-xl mb-8">
          <Link to="/">
            <img src="/logo.png" alt="Logo" />
          </Link>
        </div>

        {/* Ana Linkler */}
        <nav className="space-y-2 mb-8">
          {/* Workflows page disabled during MVP (relies on DB) – direct users to Canvas instead */}
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
        </nav>
      </div>

      {/* Alt bölüm: templates + variables + kullanıcı */}
      <div className="space-y-4">
        {/* Templates & Variables */}
        <div className="space-y-2">
          <SidebarLink
            icon={<Layers className="w-6 h-6" />}
            label="Templates"
            path="/templates"
            active={location.pathname === "/templates"}
          />
          <SidebarLink
            icon={<Database className="w-6 h-6" />}
            label="Variables"
            path="/variables"
            active={location.pathname === "/variables"}
          />
        </div>

        <div className="relative dropdown w-full">
          <button className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-gray-100">
            <div className="flex items-center gap-2 avatar">
              <User className="w-5 h-5" />
              <span className="text-sm">username</span>
            </div>

            <div className="text-sm">☰</div>
          </button>

          <div className="dropdown-content absolute left-0 bottom-full mb-2 bg-white border border-gray-200 rounded-md shadow-md w-full z-10">
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2">
              <Settings className="w-6 h-6" /> Settings
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
              onClick={handleLogOut}
            >
              <LogOut className="w-6 h-6" /> Sign Out
            </button>
          </div>
        </div>
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
      className={`flex items-center gap-3 p-3 rounded-lg w-full text-left hover:bg-[#D9DEE8] transition-colors ${
        active ? "bg-[#D9DEE8] font-semibold" : ""
      }`}
    >
      {icon}
      <span className="text-sm text-[#414244]">{label}</span>
    </Link>
  );
}
