import { useField } from "formik";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";
import {
  getCredentialModels,
  getUserCredentialById,
  type CredentialModelOption,
} from "~/services/userCredentialService";

interface NodeModelSelectProps {
  property: NodeProperty;
  values: any;
}

export const NodeModelSelect = ({ property, values }: NodeModelSelectProps) => {
  const [field, , helpers] = useField(property.name);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [models, setModels] = useState<CredentialModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [allowManual, setAllowManual] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastPrefillCredentialRef = useRef<string | null>(null);

  const credentialId = values?.credential_id as string | undefined;
  const currentValue = field.value ?? property?.default ?? "";

  const displayOptions = property?.displayOptions || {};
  const show = displayOptions.show || {};

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [dropdownOpen]);

  const loadModels = async (credId: string) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const result = await getCredentialModels(credId);
      setModels(result.models || []);
      setAllowManual(true);
      setStatusMessage(result.message || null);
    } catch (error: any) {
      setModels([]);
      setAllowManual(true);
      setStatusMessage(
        error?.message || "Could not load models. You can type a model name manually."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!credentialId) {
      setModels([]);
      setAllowManual(false);
      setStatusMessage("Select a credential to load available models.");
      lastPrefillCredentialRef.current = null;
      return;
    }

    void loadModels(credentialId);

    // Prefill from credential secret once per credential if field is empty
    if (lastPrefillCredentialRef.current === credentialId) return;
    lastPrefillCredentialRef.current = credentialId;

    if (field.value) return;

    void (async () => {
      try {
        const cred = await getUserCredentialById(credentialId);
        const secretModel = (cred as any)?.secret?.model_name;
        if (secretModel && !field.value) {
          helpers.setValue(secretModel);
        }
      } catch {
        // ignore prefill errors
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId]);

  const mergedOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ label: string; value: string; hint?: string }> = [];
    for (const model of models) {
      if (seen.has(model.id)) continue;
      seen.add(model.id);
      options.push({
        label: model.id,
        value: model.id,
        hint: model.owned_by ? `owned by ${model.owned_by}` : undefined,
      });
    }
    return options;
  }, [models]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mergedOptions;
    return mergedOptions.filter(
      (opt: { label: string; value: string }) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [mergedOptions, search]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const selectedIndex = filteredOptions.findIndex(
      (option: { value: string }) => option.value === currentValue
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    // Snap to the selected model only when the dropdown opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen) return;
    setHighlightedIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const el = optionRefs.current[highlightedIndex];
    if (dropdownOpen && el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, dropdownOpen]);

  if (Object.keys(show).length > 0) {
    for (const [dependencyName, validValue] of Object.entries(show)) {
      const dependencyValue = values[dependencyName];
      if (dependencyValue !== validValue) {
        return null;
      }
    }
  }

  const selectedOption = mergedOptions.find(
    (option: { value: string }) => option.value === currentValue
  );
  const displayText = currentValue
    ? selectedOption?.label || currentValue
    : property.placeholder || "Select model...";

  const disabled = !credentialId;

  const handleSelect = (value: string) => {
    helpers.setValue(value);
    setDropdownOpen(false);
    setSearch("");
  };

  const handleManualCommit = () => {
    const next = search.trim();
    if (!next) return;
    helpers.setValue(next);
    setDropdownOpen(false);
    setSearch("");
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((index) => (index + 1) % filteredOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((index) =>
        (index - 1 + filteredOptions.length) % filteredOptions.length
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
        return;
      }
      if (allowManual || filteredOptions.length === 0) {
        handleManualCommit();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDropdownOpen(false);
      setSearch("");
    }
  };

  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : "col-span-2"}`} key={property.name}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel label={property.displayName} helpText={getFieldHelpText(property)} />
        {credentialId && (
          <button
            type="button"
            onClick={() => loadModels(credentialId)}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs text-[var(--kai-text-muted)] transition-colors hover:text-[var(--kai-text)] disabled:opacity-50"
            title="Refresh models"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        )}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setDropdownOpen(!dropdownOpen)}
          onMouseDown={(e: any) => e.stopPropagation()}
          onTouchStart={(e: any) => e.stopPropagation()}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          className={`kai-node-field-control flex items-center justify-between px-4 py-3 text-left ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <span className={`truncate text-sm ${currentValue ? "text-[var(--kai-text)]" : "text-[var(--kai-placeholder)]"}`}>
            {loading && !currentValue ? "Loading models..." : displayText}
          </span>
          {loading ? (
            <Loader2 size={16} className="shrink-0 animate-spin text-[var(--kai-text-muted)]" />
          ) : (
            <ChevronDown
              size={16}
              className={`shrink-0 text-[var(--kai-text-muted)] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {dropdownOpen && !disabled && (
          <div className="kai-node-field-menu absolute left-0 right-0 z-50 mt-1">
            <div className="border-b border-[var(--kai-border-strong)] p-2">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  allowManual || mergedOptions.length === 0
                    ? "Search or type a model name..."
                    : "Search models..."
                }
                className="kai-node-field-control min-h-0 rounded-md px-3 py-2"
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>

            <div className="max-h-56 overflow-y-auto">
              {loading && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--kai-text-muted)]">
                  <Loader2 size={14} className="animate-spin" />
                  Loading models...
                </div>
              )}

              {!loading && filteredOptions.length === 0 && (
                <div className="px-4 py-3 text-sm text-[var(--kai-text-muted)]">
                  {allowManual || search.trim()
                    ? "No matches. Press Enter to use the typed model name."
                    : "No models available."}
                </div>
              )}

              {!loading &&
                filteredOptions.map((option: { label: string; value: string; hint?: string }, index: number) => {
                  const selected = currentValue === option.value;
                  const highlighted = index === highlightedIndex;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => handleSelect(option.value)}
                      role="option"
                      aria-selected={selected}
                      className={`kai-node-field-option flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm ${highlighted || selected ? "is-selected" : ""}`}
                    >
                      <span>{option.label}</span>
                      {option.hint && <span className="text-xs text-[var(--kai-text-muted)]">{option.hint}</span>}
                    </button>
                  );
                })}
            </div>

            {(allowManual || mergedOptions.length === 0) && search.trim() && (
              <div className="border-t border-[var(--kai-border-strong)] p-2">
                <button
                  type="button"
                  onClick={handleManualCommit}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--kai-accent-text)] transition-colors hover:bg-[var(--kai-accent-subtle)]"
                >
                  Use &quot;{search.trim()}&quot;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {statusMessage && <p className="kai-node-field-hint mt-1">{statusMessage}</p>}
    </div>
  );
};
