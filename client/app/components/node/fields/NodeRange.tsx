import { ErrorMessage, Field } from "formik";
import type { CSSProperties } from "react";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";

interface NodeRangeProps {
  property: NodeProperty;
  values: any;
}

export const NodeRange = ({ property, values }: NodeRangeProps) => {
  const displayOptions = property?.displayOptions || {};
  const show = displayOptions.show || {};

  if (Object.keys(show).length > 0) {
    for (const [dependencyName, validValue] of Object.entries(show)) {
      const dependencyValue = values[dependencyName];
      if (dependencyValue !== validValue) {
        return null;
      }
    }
  }

  // This only paints the filled track; the native range input and Formik still
  // own the value, bounds, step and keyboard/pointer interaction.
  const min = Number(property.min ?? 0);
  const max = Number(property.max ?? 100);
  const value = Number(values[property.name]);
  const progress = Number.isFinite(value) && Number.isFinite(min) && Number.isFinite(max) && max > min
    ? Math.round(Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) * 1000) / 1000
    : 0;
  const rangeStyle = { "--kai-range-progress": `${progress}%` } as CSSProperties;

  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : 'col-span-2'}`} key={property.name}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <FieldLabel
          label={property.displayName}
          helpText={getFieldHelpText(property)}
          className="min-w-0 text-sm font-medium text-[var(--kai-text-soft)]"
        />
        <output className="kai-node-range-value" htmlFor={property.name}>
          {values[property.name]}
        </output>
      </div>
      <Field
        name={property.name}
        id={property.name}
        type="range"
        min={property.min}
        max={property.max}
        step={property.step}
        aria-label={property.displayName}
        className="kai-node-range"
        style={rangeStyle}
        onMouseDown={(e: any) => e.stopPropagation()}
        onTouchStart={(e: any) => e.stopPropagation()}
      />
      <div className="mt-2 flex justify-between gap-3 text-xs text-[var(--kai-text-muted)]">
        <span>
          {property.minLabel ? `${property.minLabel} (${property.min})` : property.min}
        </span>
        <span>
          {property.maxLabel ? `${property.maxLabel} (${property.max})` : property.max}
        </span>
      </div>
      <ErrorMessage
        name={property.name}
        component="div"
        className="kai-node-field-error mt-1"
      />
    </div>
  );
};
