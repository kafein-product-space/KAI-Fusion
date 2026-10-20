import type { ReactNode } from "react";
import { useId } from "react";
import { CircleHelp } from "lucide-react";

interface FieldLabelProps {
  label: ReactNode;
  helpText?: string;
  className?: string;
  children?: ReactNode;
}

export const getFieldHelpText = (property: Record<string, any>) => {
  const helpText = property.hint ?? property.description;
  return typeof helpText === "string" && helpText.trim() ? helpText : undefined;
};

export const FieldLabel = ({
  label,
  helpText,
  className = "kai-node-field-label",
  children,
}: FieldLabelProps) => {
  const tooltipId = useId();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>{label}</span>
      {helpText && (
        <span className="relative inline-flex items-center group">
          <button
            type="button"
            aria-label="Show field help"
            aria-describedby={tooltipId}
            className="kai-node-field-help"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <CircleHelp className="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            id={tooltipId}
            role="tooltip"
            className="kai-node-field-tooltip pointer-events-none invisible absolute left-0 top-full z-50 mt-2 w-64 whitespace-normal break-words rounded-md px-3 py-2 text-left text-xs font-normal leading-relaxed opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          >
            {helpText}
          </span>
        </span>
      )}
      {children}
    </div>
  );
};
