import { useField } from "formik";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";

interface NodeSelectProps {
  property: NodeProperty;
  values: any;
}

export const NodeSelect = ({ property, values }: NodeSelectProps) => {
  const [field, , helpers] = useField(property.name);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayOptions = property?.displayOptions || {};
  const show = displayOptions.show || {};

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (Object.keys(show).length > 0) {
    for (const [dependencyName, validValue] of Object.entries(show)) {
      const dependencyValue = values[dependencyName];
      const matches =
        validValue === "*"
          ? dependencyValue !== undefined &&
            dependencyValue !== null &&
            dependencyValue !== ""
          : Array.isArray(validValue)
            ? validValue.includes(dependencyValue)
            : dependencyValue === validValue;
      if (!matches) {
        return null;
      }
    }
  }

  const currentValue = field.value ?? property?.default;
  const selectedOption = property.options?.find(
    (option: { value: string }) => option.value === currentValue
  );
  const displayText = selectedOption?.label || "Select...";

  const handleSelect = (value: string) => {
    helpers.setValue(value);
    setDropdownOpen(false);
  };

  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : 'col-span-2'}`} key={property.name}>
      <FieldLabel
        label={property.displayName}
        helpText={getFieldHelpText(property)}
      />

      {/* Custom Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          onMouseDown={(e: any) => e.stopPropagation()}
          onTouchStart={(e: any) => e.stopPropagation()}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          className="kai-node-field-control flex cursor-pointer items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm text-[var(--kai-text)]">{displayText}</span>
          <ChevronDown
            size={16}
            className={`text-[var(--kai-text-muted)] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="kai-node-field-menu absolute left-0 right-0 z-50 mt-1" role="listbox">
            {property.options?.map((option: { label: string; value: string; hint: string }) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={currentValue === option.value}
                className={`kai-node-field-option flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${currentValue === option.value ? "is-selected" : ""}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedOption?.hint && (
        <p className="kai-node-field-hint mt-1">{selectedOption.hint}</p>
      )}
    </div>
  );
};
