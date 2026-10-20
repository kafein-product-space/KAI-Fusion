import React, { useState } from "react";
import { X, Download, Package, Check, Square, CheckSquare, AlertCircle } from "lucide-react";
import { exportWorkflows } from "~/services/exportService";
import type { Workflow } from "~/types/api";

interface WorkflowExportModalProps {
    isOpen: boolean;
    workflows: Workflow[];
    onClose: () => void;
}

export default function WorkflowExportModal({
    isOpen,
    workflows,
    onClose,
}: WorkflowExportModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exportName, setExportName] = useState("");
    const [exportNameTouched, setExportNameTouched] = useState(false);

    if (!isOpen) return null;

    const handleToggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === workflows.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(workflows.map((w) => w.id)));
        }
    };

    // Validate export name
    const getExportNameError = (): string | null => {
        if (!exportName.trim()) return "Export name is required";
        if (exportName.trim().length < 2) return "Export name must be at least 2 characters";
        if (!/^[a-zA-Z0-9_\-\s]+$/.test(exportName.trim())) return "Only letters, numbers, spaces, hyphens and underscores allowed";
        return null;
    };

    const exportNameError = exportNameTouched ? getExportNameError() : null;
    const isExportDisabled = isExporting || selectedIds.size === 0 || !!getExportNameError();

    const handleExport = async () => {
        setExportNameTouched(true);
        const nameError = getExportNameError();
        if (nameError) {
            setError(nameError);
            return;
        }

        if (selectedIds.size === 0) {
            setError("Please select at least one workflow");
            return;
        }

        setIsExporting(true);
        setError(null);

        try {
            // Sanitize export name: remove spaces, lowercase
            const sanitizedName = exportName.trim().replace(/\s+/g, '').toLowerCase();
            await exportWorkflows(Array.from(selectedIds), sanitizedName);
            onClose();
        } catch (err: any) {
            setError(err?.message || "Failed to export workflows");
        } finally {
            setIsExporting(false);
        }
    };

    const allSelected = selectedIds.size === workflows.length && workflows.length > 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="export-workflows-title">
                <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-dialog)] text-zinc-100 shadow-2xl shadow-black/50">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--kai-border-dialog)] p-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--kai-accent)]/15">
                                <Package className="h-5 w-5 text-[var(--kai-accent-text)]" />
                            </div>
                            <div>
                                <h3 id="export-workflows-title" className="text-lg font-semibold text-white">
                                    Export Workflows
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Select workflows to export as ZIP
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isExporting}
                            aria-label="Close export workflows"
                            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-white disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Export Name Input */}
                        <div className="mb-5">
                            <label htmlFor="export-name" className="mb-1.5 block text-sm font-medium text-zinc-200">
                                Export Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="export-name"
                                type="text"
                                value={exportName}
                                onChange={(e) => {
                                    setExportName(e.target.value);
                                    if (!exportNameTouched) setExportNameTouched(true);
                                }}
                                onBlur={() => setExportNameTouched(true)}
                                placeholder="e.g. my_project"
                                className={`w-full rounded-lg border bg-[var(--kai-sidebar)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:ring-2 focus:ring-[var(--kai-accent)]/25 ${
                                    exportNameError
                                        ? "border-red-400/60 focus:border-red-400"
                                        : "border-[var(--kai-border-strong)] hover:border-[var(--kai-control-muted)] focus:border-[var(--kai-accent)]"
                                }`}
                            />
                            {exportNameError && (
                                <div className="mt-1.5 flex items-center gap-1 text-xs text-red-300">
                                    <AlertCircle className="w-3 h-3" />
                                    {exportNameError}
                                </div>
                            )}
                            <p className="mt-1.5 text-xs text-zinc-400">
                                ZIP will contain: <code className="rounded bg-[var(--kai-surface-hover)] px-1 py-0.5 text-zinc-200">flows/</code> and <code className="rounded bg-[var(--kai-surface-hover)] px-1 py-0.5 text-zinc-200">{exportName.trim().replace(/\s+/g, '').toLowerCase() || '...'}_workflows_config.yaml</code>
                            </p>
                        </div>

                        {/* Select All */}
                        <button
                            onClick={handleSelectAll}
                            className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-[var(--kai-accent-text)]"
                        >
                            {allSelected ? (
                                <CheckSquare className="w-4 h-4 text-[var(--kai-accent-text)]" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            {allSelected ? "Deselect All" : "Select All"}
                        </button>

                        {/* Workflow List */}
                        <div className="space-y-2">
                            {workflows.length === 0 ? (
                                <p className="py-8 text-center text-zinc-400">
                                    No workflows available
                                </p>
                            ) : (
                                workflows.map((workflow) => (
                                    <button
                                        key={workflow.id}
                                        onClick={() => handleToggle(workflow.id)}
                                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kai-accent-text)] ${selectedIds.has(workflow.id)
                                                ? "border-[var(--kai-accent)]/65 bg-[var(--kai-accent)]/15"
                                                : "border-[var(--kai-border-dialog)] bg-[var(--kai-surface-control)] hover:border-[var(--kai-accent)]/45 hover:bg-[var(--kai-surface-hover-strong)]"
                                            }`}
                                    >
                                        <div
                                            className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center ${selectedIds.has(workflow.id)
                                                    ? "bg-[var(--kai-accent)]"
                                                    : "border-2 border-[var(--kai-control-muted)]"
                                                }`}
                                        >
                                            {selectedIds.has(workflow.id) && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium text-white">
                                                {workflow.name}
                                            </p>
                                            {workflow.description && (
                                                <p className="truncate text-sm text-zinc-400">
                                                    {workflow.description}
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ${workflow.is_public
                                                    ? "bg-[var(--kai-accent)]/15 text-[var(--kai-accent-text)]"
                                                    : "bg-[var(--kai-border-dialog)] text-zinc-300"
                                                }`}
                                        >
                                            {workflow.is_public ? "Public" : "Private"}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-[var(--kai-border-dialog)] bg-[var(--kai-sidebar)] p-6">
                        <p className="text-sm text-zinc-400">
                            {selectedIds.size} of {workflows.length} selected
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                disabled={isExporting}
                                className="rounded-lg border border-[var(--kai-border-strong)] bg-[var(--kai-surface-control)] px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-[var(--kai-surface-hover)] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={isExportDisabled}
                                className="flex items-center gap-2 rounded-lg bg-[var(--kai-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--kai-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Export as ZIP
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
