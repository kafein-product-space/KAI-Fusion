import React, { useState } from "react";
import { Search, Plus, ArrowRight } from "lucide-react";
import {
  SERVICE_DEFINITIONS,
  getServicesByCategory,
  getCategoryLabel,
} from "~/types/credentials";
import { resolveIconPath } from "~/lib/iconUtils";
import type { ServiceDefinition } from "~/types/credentials";

interface ServiceSelectionModalProps {
  onSelectService: (service: ServiceDefinition) => void;
  onClose: () => void;
  allowedServiceTypes?: string[];
}

const ServiceSelectionModal: React.FC<ServiceSelectionModalProps> = ({
  onSelectService,
  onClose,
  allowedServiceTypes,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const servicesByCategory = getServicesByCategory();
  const categories = Object.keys(servicesByCategory);

  const filteredServices = SERVICE_DEFINITIONS.filter((service) => {
    if (allowedServiceTypes && !allowedServiceTypes.includes(service.id)) {
      return false;
    }
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleServiceSelect = (service: ServiceDefinition) => {
    onSelectService(service);
  };

  // Track which icons failed to load so we can fallback to emoji
  const [iconErrorMap, setIconErrorMap] = useState<Record<string, boolean>>({});

  const renderServiceIcon = (service: ServiceDefinition) => {
    const iconSrc = resolveIconPath(
      service.icon ? `icons/${service.icon}` : `icons/${service.id}.svg`
    );
    const failed = iconErrorMap[service.id];
    return (
      <div className="w-10 h-10 flex items-center justify-center">
        {!failed && (
          <img
            src={iconSrc}
            alt={`${service.name} logo`}
            className="w-10 h-10 object-contain"
            onError={() =>
              setIconErrorMap((prev) => ({ ...prev, [service.id]: true }))
            }
          />
        )}
        {failed && <div className="text-3xl">{service.icon}</div>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-[var(--kai-border-soft)] bg-[var(--kai-surface-dialog)] text-zinc-100 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="border-b border-[var(--kai-border-soft)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Connect to a Service
              </h2>
              <p className="mt-1 text-zinc-400">
                Choose a service to connect and configure your credentials
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search and Filter */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[var(--kai-control-border)] bg-[var(--kai-surface-control)] py-3 pl-10 pr-4 text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--kai-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kai-accent)]/20"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="cursor-pointer rounded-lg border border-[var(--kai-control-border)] bg-[var(--kai-surface-control)] px-4 py-3 text-zinc-100 focus:border-[var(--kai-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kai-accent)]/20"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Services Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                No services found
              </h3>
              <p className="text-zinc-400">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceSelect(service)}
                  className="group w-full cursor-pointer rounded-xl border border-[var(--kai-border-soft)] bg-[var(--kai-surface-control)] p-6 text-left transition-colors hover:border-[var(--kai-accent)]/65 hover:bg-[var(--kai-surface-hover-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--kai-accent)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    {renderServiceIcon(service)}
                    <ArrowRight className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-[var(--kai-accent-text-soft)]" />
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-[var(--kai-accent-text-soft)]">
                    {service.name}
                  </h3>

                  <p className="mb-4 line-clamp-2 text-sm text-zinc-400">
                    {service.description}
                  </p>

                  <div className="flex items-center justify-between">
                        <span className="inline-flex rounded-full bg-[var(--kai-credential-badge-bg)] px-2 py-1 text-xs font-medium text-zinc-200">
                      {getCategoryLabel(service.category)}
                    </span>

                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <Plus className="w-3 h-3" />
                      Connect
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--kai-border-soft)] bg-[var(--kai-credential-footer-bg)] p-6">
          <div className="text-center">
            <p className="text-sm text-zinc-400">
              Can't find the service you're looking for?{" "}
              <button className="font-medium text-[var(--kai-accent-text-soft)] transition-colors hover:text-white">
                Request a new integration
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelectionModal;
