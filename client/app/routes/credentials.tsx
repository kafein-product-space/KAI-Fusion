// imports
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Zap,
  Shield,
  Database,
  Globe,
  Cloud,
  Settings,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useUserCredentialStore } from "../stores/userCredential";
import type { CredentialCreateRequest, UserCredential } from "../types/api";
import Loading from "~/components/Loading";
import AuthGuard from "~/components/AuthGuard";
import { apiClient } from "../lib/api-client";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import ServiceSelectionModal from "../components/credentials/ServiceSelectionModal";
import DynamicCredentialForm from "../components/credentials/DynamicCredentialForm";
import CredentialCard from "../components/credentials/CredentialCard";
import {
  type ServiceDefinition,
  getServicesByCategory,
  getCategoryLabel,
} from "~/types/credentials";

function CredentialsLayout() {
  const {
    userCredentials,
    fetchCredentials,
    addCredential,
    updateCredential,
    removeCredential,
    isLoading,
    error,
  } = useUserCredentialStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [page, setPage] = useState(1);
  const [editingCredential, setEditingCredential] =
    useState<UserCredential | null>(null);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [selectedService, setSelectedService] =
    useState<ServiceDefinition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingInitialValues, setEditingInitialValues] = useState<Record<string, any>>({});

  const servicesByCategory = getServicesByCategory();
  const categories = Object.keys(servicesByCategory);

  const filteredCredentials = userCredentials.filter((credential) => {
    const matchesSearch =
      credential.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credential.service_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      getServicesByCategory()[selectedCategory]?.some(
        (s) => s.id === credential.service_type
      );
    return matchesSearch && matchesCategory;
  });

  const totalItems = filteredCredentials.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pagedCredentials = filteredCredentials.slice(startIdx, endIdx);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleServiceSelect = (service: ServiceDefinition) => {
    setSelectedService(service);
    setShowServiceSelection(false);
  };

  const handleCredentialSubmit = async (values: Record<string, any>) => {
    if (!selectedService) return;

    setIsSubmitting(true);
    try {
      const payload: CredentialCreateRequest = {
        name: values.name || `${selectedService.name} Credential`,
        data: values,
        service_type: selectedService.id,
      };

      await addCredential(payload);
      setSelectedService(null);
      setShowServiceSelection(false);
    } catch (e: any) {
      console.error("Failed to create credential:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCredential = async (credential: UserCredential) => {
    setEditingCredential(credential);
    // Get the service definition for editing
    const servicesByCategory = getServicesByCategory();
    const allServices = Object.values(servicesByCategory).flat();
    const serviceDef = allServices.find(
      (s: ServiceDefinition) => s.id === credential.service_type
    );
    if (serviceDef) {
      setSelectedService(serviceDef);
    }
    try {
      const detail = await getUserCredentialSecret(credential.id);
      if ((detail as any)?.secret && typeof (detail as any).secret === "object") {
        setEditingInitialValues((detail as any).secret);
      } else {
        setEditingInitialValues({});
      }
    } catch (e) {
      console.error("Failed to fetch credential secret for editing:", e);
      setEditingInitialValues({});
    }
  };

  const handleUpdateCredential = async (values: Record<string, any>) => {
    if (!editingCredential || !selectedService) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<CredentialCreateRequest> = {
        name: values.name || editingCredential.name,
        data: values,
        service_type: selectedService.id,
      };

      await updateCredential(editingCredential.id, payload);
      setEditingCredential(null);
      setSelectedService(null);
    } catch (e: any) {
      console.error("Failed to update credential:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    try {
      await removeCredential(id);
    } catch (e: any) {
      console.error("Failed to delete credential:", e);
    }
  };

  const handleViewSecret = async (id: string): Promise<string> => {
    try {
      const response = await apiClient.get(`/credentials/${id}/secret`);
      return JSON.stringify(response.secret || {});
    } catch (error) {
      console.error("Failed to fetch secret:", error);
      return "";
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      ai: <Zap className="w-5 h-5" />,
      database: <Database className="w-5 h-5" />,
      api: <Globe className="w-5 h-5" />,
      storage: <Cloud className="w-5 h-5" />,
      cache: <Database className="w-5 h-5" />,
      triggers: <Settings className="w-5 h-5" />,
      other: <Shield className="w-5 h-5" />,
    };
    return icons[category] || <Shield className="w-5 h-5" />;
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar />

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Credentials
                </h1>
                <p className="text-gray-600 text-sm">
                  Connect and manage your service integrations securely
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="search"
                    className="pl-8 pr-3 py-1.5 w-56 border border-gray-300 rounded-lg text-sm"
                    placeholder="Search credentials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 text-sm"
                  onClick={() => setShowServiceSelection(true)}
                >
                  <Plus className="w-4 h-4" />
                  Connect Service
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-200 text-sm ${
                    selectedCategory === "all"
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  All Services
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-200 text-sm ${
                      selectedCategory === category
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loading size="sm" />
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">
                {error}
              </div>
            ) : userCredentials.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-10">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-12 h-12 text-purple-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No Credentials Yet
                  </h3>
                  <p className="text-gray-600 mb-3 text-sm">
                    Connect your first service to get started with KAI Fusion
                  </p>
                  <button
                    onClick={() => setShowServiceSelection(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 text-sm"
                  >
                    Connect Your First Service
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pagedCredentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    onEdit={handleEditCredential}
                    onDelete={handleDeleteCredential}
                    onViewSecret={handleViewSecret}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !error && userCredentials.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-white rounded-xl">
                  <div></div>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all duration-200 ${
                            p === page
                              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 text-right">
                    Items {totalItems === 0 ? 0 : startIdx + 1} to {endIdx} of{" "}
                    {totalItems}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Service Selection Modal */}
      {showServiceSelection && (
        <ServiceSelectionModal
          onSelectService={handleServiceSelect}
          onClose={() => setShowServiceSelection(false)}
        />
      )}

      {/* Dynamic Credential Form Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCredential
                    ? "Edit Credential"
                    : "Connect to " + selectedService.name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedService(null);
                    setEditingCredential(null);
                    setEditingInitialValues({});
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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

              <DynamicCredentialForm
                service={selectedService}
                onSubmit={
                  editingCredential
                    ? handleUpdateCredential
                    : handleCredentialSubmit
                }
                onCancel={() => {
                  setSelectedService(null);
                  setEditingCredential(null);
                  setEditingInitialValues({});
                }}
                initialValues={editingCredential ? editingInitialValues : {}}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedCredentialsLayout() {
  return (
    <AuthGuard>
      <CredentialsLayout />
    </AuthGuard>
  );
}
