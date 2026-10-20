import React from "react";
import { type LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: TabNavigationProps) {
  return (
    <div
      className={`flex gap-1 rounded-lg border border-[var(--kai-navigation-border)] bg-[var(--kai-surface-selected)] p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTabChange(tab.id);
            }}
            className={`
            flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium
            transition-all duration-200 relative
            ${
              isActive
              ? "border border-[var(--kai-tab-active-border)] bg-[var(--kai-tab-active-bg)] text-white"
                : "border border-transparent text-zinc-400 hover:bg-[var(--kai-border-dialog)] hover:text-zinc-100"
            }
          `}
            title={tab.description}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>

            {/* Active indicator */}
            {isActive && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-md bg-[var(--kai-accent-text-soft)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
