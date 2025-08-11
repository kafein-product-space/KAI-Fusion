import React, { useEffect, useState } from "react";
import {
  Copy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useSnackbar } from "notistack";
import DashboardSidebar from "~/components/dashboard/DashboardSidebar";
import { useWorkflows } from "~/stores/workflows";
import { usePinnedItems } from "~/stores/pinnedItems";
import { timeAgo } from "~/lib/dateFormatter";
import AuthGuard from "~/components/AuthGuard";
import Loading from "~/components/Loading";
import PinButton from "~/components/common/PinButton";

function MarketplaceLayout() {
  const { enqueueSnackbar } = useSnackbar();
  const {
    publicWorkflows,
    fetchPublicWorkflows,
    duplicateWorkflow,
    isLoading,
    error,
  } = useWorkflows();
  const { getPinnedItems } = usePinnedItems();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [page, setPage] = useState(1);

  const filteredWorkflows = publicWorkflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = filteredWorkflows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pagedWorkflows = filteredWorkflows.slice(startIdx, endIdx);

  useEffect(() => {
    fetchPublicWorkflows();
  }, [fetchPublicWorkflows]);

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    try {
      await duplicateWorkflow(id);
      enqueueSnackbar("Workflow başarıyla kopyalandı!", {
        variant: "success",
        autoHideDuration: 3000,
      });
    } catch (e: any) {
      console.error("Duplicate error:", e);
      enqueueSnackbar("Workflow kopyalanamadı!", {
        variant: "error",
        autoHideDuration: 4000,
      });
    } finally {
      setDuplicating(null);
    }
  };

  // Pre-built Templates
  const prebuiltTemplates = [
    {
      id: "email_automation",
      name: "Email Automation Workflow",
      description:
        "Trigger-driven email sending via HTTP client (integrate your provider).",
      colorFrom: "from-blue-500",
      colorTo: "to-indigo-600",
      buildFlow: () => {
        const nodes = [
          {
            id: "StartNode-1",
            type: "StartNode",
            position: { x: 100, y: 100 },
            data: { name: "Start" },
          },
          {
            id: "HttpRequest-2",
            type: "HttpRequest",
            position: { x: 350, y: 100 },
            data: {
              name: "Send Email",
              method: "POST",
              url: "https://api.your-email-provider.com/send",
              headers: '{\n  "Authorization": "Bearer <API_KEY>"\n}',
              body: '{\n  "to": "user@example.com",\n  "subject": "Hello",\n  "text": "Hi from KAI-Fusion!"\n}',
            },
          },
          {
            id: "EndNode-3",
            type: "EndNode",
            position: { x: 600, y: 100 },
            data: { name: "End" },
          },
        ];
        const edges = [
          {
            id: "e1-2",
            source: "StartNode-1",
            target: "HttpRequest-2",
            type: "custom",
          },
          {
            id: "e2-3",
            source: "HttpRequest-2",
            target: "EndNode-3",
            type: "custom",
          },
        ];
        return { nodes, edges };
      },
    },
    {
      id: "content_generation",
      name: "Content Generation Pipeline",
      description:
        "Generate content using OpenAI Chat node with a simple start/end flow.",
      colorFrom: "from-purple-500",
      colorTo: "to-pink-600",
      buildFlow: () => {
        const nodes = [
          {
            id: "StartNode-1",
            type: "StartNode",
            position: { x: 100, y: 200 },
            data: { name: "Start" },
          },
          {
            id: "OpenAIChat-2",
            type: "OpenAIChat",
            position: { x: 350, y: 200 },
            data: {
              name: "OpenAI Chat",
              systemPrompt: "You are a helpful content generator.",
            },
          },
          {
            id: "EndNode-3",
            type: "EndNode",
            position: { x: 600, y: 200 },
            data: { name: "End" },
          },
        ];
        const edges = [
          {
            id: "e1-2",
            source: "StartNode-1",
            target: "OpenAIChat-2",
            type: "custom",
          },
          {
            id: "e2-3",
            source: "OpenAIChat-2",
            target: "EndNode-3",
            type: "custom",
          },
        ];
        return { nodes, edges };
      },
    },
    {
      id: "data_analysis",
      name: "Data Analysis Flow",
      description:
        "Load, split, embed and retrieve data for Q&A style analysis.",
      colorFrom: "from-emerald-500",
      colorTo: "to-teal-600",
      buildFlow: () => {
        const nodes = [
          {
            id: "DocumentLoader-1",
            type: "DocumentLoader",
            position: { x: 100, y: 320 },
            data: { name: "Load Docs" },
          },
          {
            id: "ChunkSplitter-2",
            type: "ChunkSplitter",
            position: { x: 350, y: 320 },
            data: { name: "Split Chunks", chunk_size: 500, chunk_overlap: 50 },
          },
          {
            id: "OpenAIEmbedder-3",
            type: "OpenAIEmbedder",
            position: { x: 600, y: 320 },
            data: { name: "Embed" },
          },
          {
            id: "PGVectorStore-4",
            type: "PGVectorStore",
            position: { x: 850, y: 320 },
            data: { name: "Store" },
          },
          {
            id: "RetrievalQA-5",
            type: "RetrievalQA",
            position: { x: 1100, y: 320 },
            data: { name: "Retrieval QA" },
          },
          {
            id: "EndNode-6",
            type: "EndNode",
            position: { x: 1350, y: 320 },
            data: { name: "End" },
          },
        ];
        const edges = [
          {
            id: "e1-2",
            source: "DocumentLoader-1",
            target: "ChunkSplitter-2",
            type: "custom",
          },
          {
            id: "e2-3",
            source: "ChunkSplitter-2",
            target: "OpenAIEmbedder-3",
            type: "custom",
          },
          {
            id: "e3-4",
            source: "OpenAIEmbedder-3",
            target: "PGVectorStore-4",
            type: "custom",
          },
          {
            id: "e4-5",
            source: "PGVectorStore-4",
            target: "RetrievalQA-5",
            type: "custom",
          },
          {
            id: "e5-6",
            source: "RetrievalQA-5",
            target: "EndNode-6",
            type: "custom",
          },
        ];
        return { nodes, edges };
      },
    },
    {
      id: "customer_support",
      name: "Customer Support Automation",
      description:
        "Webhook-triggered support assistant with retrieval-augmented answers.",
      colorFrom: "from-amber-500",
      colorTo: "to-orange-600",
      buildFlow: () => {
        const nodes = [
          {
            id: "WebhookTrigger-1",
            type: "WebhookTrigger",
            position: { x: 100, y: 440 },
            data: { name: "Webhook" },
          },
          {
            id: "RetrievalQA-2",
            type: "RetrievalQA",
            position: { x: 350, y: 440 },
            data: { name: "Answer" },
          },
          {
            id: "OpenAIChat-3",
            type: "OpenAIChat",
            position: { x: 600, y: 440 },
            data: { name: "Reply" },
          },
          {
            id: "EndNode-4",
            type: "EndNode",
            position: { x: 850, y: 440 },
            data: { name: "End" },
          },
        ];
        const edges = [
          {
            id: "e1-2",
            source: "WebhookTrigger-1",
            target: "RetrievalQA-2",
            type: "custom",
          },
          {
            id: "e2-3",
            source: "RetrievalQA-2",
            target: "OpenAIChat-3",
            type: "custom",
          },
          {
            id: "e3-4",
            source: "OpenAIChat-3",
            target: "EndNode-4",
            type: "custom",
          },
        ];
        return { nodes, edges };
      },
    },
  ] as const;

  const handleUseTemplate = async (tplId: string) => {
    const tpl = prebuiltTemplates.find((t) => t.id === tplId);
    if (!tpl) return;

    try {
      const flow = tpl.buildFlow();
      const created = await useWorkflows.getState().createWorkflow({
        name: tpl.name,
        description: tpl.description,
        flow_data: flow,
      });
      enqueueSnackbar("Template workflow created!", { variant: "success" });
      navigate(`/canvas?workflow=${created.id}`);
    } catch (e: any) {
      enqueueSnackbar("Failed to create template workflow", {
        variant: "error",
      });
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 p-10 m-10 bg-background">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Marketplace
              </h1>
              <p className="text-gray-600 text-lg">
                Discover and copy public workflows shared by the community.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-xl"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={fetchPublicWorkflows}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Pre-built Templates */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Pre-built Templates
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {prebuiltTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`rounded-2xl p-5 border border-gray-200 bg-white hover:shadow-lg transition-all duration-300`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg mb-3 bg-gradient-to-br ${tpl.colorFrom} ${tpl.colorTo}`}
                  />
                  <h3 className="text-base font-semibold text-gray-900">
                    {tpl.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 min-h-[40px]">
                    {tpl.description}
                  </p>
                  <div className="mt-4">
                    <button
                      className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                      onClick={() => handleUseTemplate(tpl.id)}
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pinned Workflows Section */}
          {(() => {
            const pinnedWorkflows = getPinnedItems("workflow");
            if (pinnedWorkflows.length > 0) {
              return (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-semibold text-gray-900">
                      Your Pinned Workflows
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      {pinnedWorkflows.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pinnedWorkflows.map((wf) => (
                      <div
                        key={wf.id}
                        className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {wf.title}
                          </h3>
                          <PinButton
                            id={wf.id}
                            type="workflow"
                            title={wf.title}
                            description={wf.description}
                            metadata={wf.metadata}
                            size="sm"
                            variant="minimal"
                          />
                        </div>
                        <p className="text-gray-600 text-sm mb-4">
                          {wf.description || "No description available"}
                        </p>
                        <div className="text-xs text-gray-500 space-y-1 mb-4">
                          <div>
                            <strong>Pinned:</strong> {timeAgo(wf.pinnedAt)}
                          </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-red-100">
                          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700">
                            <Copy className="w-4 h-4" />
                            Copy Workflow
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loading size="sm" />
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No public workflows found
                </h3>
                <p className="text-gray-600">
                  There are no public workflows available at the moment. Try
                  again later.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-purple-200"
                >
                  <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-purple-600">
                      {wf.name}
                    </h3>
                    <PinButton
                      id={wf.id}
                      type="workflow"
                      title={wf.name}
                      description={wf.description}
                      metadata={{
                        status: "Public",
                        lastActivity: wf.created_at,
                      }}
                      size="sm"
                      variant="minimal"
                    />
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    {wf.description || "No description available"}
                  </p>
                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <div>
                      <strong>Owner:</strong>{" "}
                      <span className="font-mono">
                        {wf.user_id?.slice(0, 8) || "Unknown"}...
                      </span>
                    </div>
                    <div>
                      <strong>Created:</strong> {timeAgo(wf.created_at)}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                      onClick={() => handleDuplicate(wf.id)}
                      disabled={duplicating === wf.id}
                    >
                      <Copy
                        className={`w-4 h-4 ${
                          duplicating === wf.id ? "animate-spin" : ""
                        }`}
                      />
                      {duplicating === wf.id ? "Copying..." : "Copy Workflow"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && publicWorkflows.length > 0 && (
            <div className="mt-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white  rounded-2xl">
                <div></div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-4 py-2 rounded-lg text-sm border ${
                          p === page
                            ? "bg-purple-600 text-white"
                            : "bg-white text-gray-700 border-gray-300"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  Items {totalItems === 0 ? 0 : startIdx + 1} to {endIdx} of{" "}
                  {totalItems}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProtectedMarketplaceLayout() {
  return (
    <AuthGuard>
      <MarketplaceLayout />
    </AuthGuard>
  );
}
