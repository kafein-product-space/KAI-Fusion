import React from "react";
import { Sparkles, X, Settings, Info } from "lucide-react";
import { useSmartSuggestions } from "~/stores/smartSuggestions";
import { SmartSuggestionsService } from "~/services/smartSuggestions";

interface SmartSuggestionsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SmartSuggestionsSettingsModal: React.FC<
  SmartSuggestionsSettingsModalProps
> = ({ isOpen, onClose }) => {
  const { isEnabled, setEnabled, lastAddedNode } = useSmartSuggestions();
  const availableChains = SmartSuggestionsService.getAvailableChains();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="smart-suggestions-title">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-dialog)] p-6 text-zinc-100 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            <h2 id="smart-suggestions-title" className="text-xl font-semibold text-white">
              Smart Suggestions Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close smart suggestions settings"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between rounded-lg border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-control)] p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <div>
                <h3 className="text-white font-medium">
                  Enable Smart Suggestions
                </h3>
                <p className="text-gray-400 text-sm">
                  Get intelligent node recommendations based on your workflow
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--kai-accent)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--kai-accent)]"></div>
            </label>
          </div>
        </div>

        {/* Current Status */}
        {lastAddedNode && (
          <div className="mb-6 rounded-lg border border-[var(--kai-accent)]/25 bg-[var(--kai-accent)]/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-[var(--kai-accent-text)]" />
              <span className="text-sm font-medium text-[var(--kai-accent-text)]">
                Current Context
              </span>
            </div>
            <p className="text-white text-sm">
              Last added node:{" "}
              <span className="font-medium text-[var(--kai-accent-text)]">{lastAddedNode}</span>
            </p>
            {SmartSuggestionsService.hasRecommendations(lastAddedNode) && (
              <p className="text-gray-300 text-xs mt-1">
                Recommendations available for this node type
              </p>
            )}
          </div>
        )}

        {/* Available Node Chains */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Available Node Chains
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {availableChains.map((chain, index) => (
              <div
                key={index}
                className="rounded-lg border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-control)] p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium text-sm">
                    {chain.trigger}
                  </h4>
                  <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">
                    {chain.category}
                  </span>
                </div>
                <p className="text-gray-300 text-xs mb-2">
                  {chain.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {chain.recommendations.map((rec, recIndex) => (
                    <span
                      key={recIndex}
                      className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded"
                    >
                      {rec}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">
            How Smart Suggestions Work
          </h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              • When you add a node to your workflow, Smart Suggestions analyzes
              the node type
            </p>
            <p>
              • Based on common workflow patterns, it suggests the next logical
              nodes
            </p>
            <p>
              • Recommendations appear at the top of the sidebar with a
              "Recommended" label
            </p>
            <p>
              • You can enable/disable this feature at any time using the toggle
              above
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--kai-border-strong)] bg-[var(--kai-surface-control)] px-4 py-2 text-white transition-colors hover:bg-[var(--kai-surface-hover)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSuggestionsSettingsModal;
