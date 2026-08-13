import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useField } from "formik";
import { ChevronDown, Loader2 } from "lucide-react";
import type { ServiceField } from "~/types/credentials";
import {
  listModelsRaw,
  type CredentialModelOption,
} from "~/services/userCredentialService";

interface CredentialModelComboboxProps {
  field: ServiceField;
  serviceType: string;
  values: Record<string, any>;
  className?: string;
}

const META_KEYS = new Set(["id", "name", "service_type", "created_at", "updated_at", "data", "secret"]);

const isUsableUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return (
      host === "localhost" ||
      host.includes(".") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
    );
  } catch {
    return false;
  }
};

const CredentialModelCombobox = ({
  field,
  serviceType,
  values,
  className = "",
}: CredentialModelComboboxProps) => {
  const [formikField, , helpers] = useField(field.name);
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<CredentialModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const requestIdRef = useRef(0);

  const currentValue = String(formikField.value ?? field.default ?? "");
  const staticOptions = useMemo(() => field.options || [], [field.options]);

  const canFetch = useMemo(() => {
    if (serviceType === "openai") {
      return String(values.api_key || "").trim().length >= 20;
    }
    if (serviceType === "openai_compatible") {
      return isUsableUrl(String(values.base_url || ""));
    }
    return false;
  }, [serviceType, values.api_key, values.base_url]);

  const fetchKey = useMemo(
    () =>
      JSON.stringify({
        serviceType,
        base_url: values.base_url || "",
        api_key: values.api_key || "",
        skip_ssl_verify: values.skip_ssl_verify || false,
        canFetch,
      }),
    [serviceType, values.base_url, values.api_key, values.skip_ssl_verify, canFetch]
  );

  const fetchModels = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!canFetch) {
      setModels([]);
      setStatusMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const payload = Object.fromEntries(
      Object.entries(values).filter(([key]) => !META_KEYS.has(key) && key !== field.name)
    );

    try {
      const result = await listModelsRaw(serviceType, payload);
      if (requestId !== requestIdRef.current) return;
      setModels(result.models || []);
      setStatusMessage(result.message || null);
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return;
      setModels([]);
      setStatusMessage(error?.message || "Could not load models. You can type a model name.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [canFetch, field.name, serviceType, values]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchModels();
    }, 450);
    return () => window.clearTimeout(timeout);
    // fetchKey captures the fields that should trigger a refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const mergedOptions = useMemo(() => {
    const fromProvider = models.map((model) => ({
      label: model.id,
      value: model.id,
      hint: model.owned_by ? `owned by ${model.owned_by}` : undefined,
    }));
    if (fromProvider.length > 0) return fromProvider;
    return staticOptions.map((option) => ({
      label: option.label || option.value,
      value: option.value,
      hint: undefined as string | undefined,
    }));
  }, [models, staticOptions]);

  const filteredOptions = useMemo(() => {
    const query = currentValue.trim().toLowerCase();
    if (!query) return mergedOptions;
    const exactMatch = mergedOptions.some(
      (option) => option.value.toLowerCase() === query || option.label.toLowerCase() === query
    );
    if (exactMatch) return mergedOptions;
    return mergedOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
    );
  }, [currentValue, mergedOptions]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filteredOptions.findIndex(
      (option) => option.value === currentValue
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    // Only snap to the current value when the list is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHighlightedIndex(0);
    // Typing filters the list; keep the highlight on the first match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const el = optionRefs.current[highlightedIndex];
    if (open && el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open]);

  const selectOption = (value: string) => {
    helpers.setValue(value);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((index) =>
        filteredOptions.length === 0 ? 0 : (index + 1) % filteredOptions.length
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((index) =>
        filteredOptions.length === 0
          ? 0
          : (index - 1 + filteredOptions.length) % filteredOptions.length
      );
      return;
    }

    if (event.key === "Enter") {
      if (open) {
        event.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex].value);
        }
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          name={field.name}
          value={currentValue}
          placeholder={field.placeholder}
          autoComplete="off"
          onChange={(event) => {
            helpers.setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`${className} !pr-10`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${field.name}-model-list`}
          aria-activedescendant={
            open && filteredOptions[highlightedIndex]
              ? `${field.name}-option-${highlightedIndex}`
              : undefined
          }
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute inset-y-0 right-0 z-10 flex w-11 items-center justify-center text-gray-500 hover:text-gray-700"
          aria-label="Toggle model list"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </button>
      </div>

      {open && (
        <div
          id={`${field.name}-model-list`}
          role="listbox"
          className="absolute z-50 mt-1 left-0 right-0 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {loading && filteredOptions.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading models...
            </div>
          )}

          {!loading && filteredOptions.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              {currentValue.trim()
                ? "No matches. Keep typing to use a custom model name."
                : statusMessage || "No models available."}
            </div>
          )}

          {filteredOptions.map((option, index) => {
            const selected = currentValue === option.value;
            const highlighted = index === highlightedIndex;
            return (
              <button
                key={option.value}
                id={`${field.name}-option-${index}`}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(option.value)}
                className={`w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-sm text-left ${
                  highlighted
                    ? "bg-blue-50 text-blue-700"
                    : selected
                      ? "bg-blue-50/60 text-blue-700"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <span>{option.label}</span>
                {option.hint && <span className="text-xs text-gray-400">{option.hint}</span>}
              </button>
            );
          })}
        </div>
      )}

      {statusMessage && (
        <p className="text-xs text-gray-500 mt-1">{statusMessage}</p>
      )}
    </div>
  );
};

export default CredentialModelCombobox;
