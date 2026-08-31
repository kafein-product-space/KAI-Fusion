import { useField } from "formik";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";
import { ThemedNumberInput } from "./ThemedNumberInput";

interface NodeNumberProps {
  property: NodeProperty;
  values: any;
}

const BYTES_PER_MB = 1024 * 1024;

function numberScale(property: NodeProperty): number {
  return property.unit === "MB" ? BYTES_PER_MB : 1;
}

function displayNumber(property: NodeProperty, value: unknown): number | "" {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / numberScale(property) : "";
}

function storedNumber(property: NodeProperty, value: unknown): number | "" {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * numberScale(property)) : "";
}

function UnitNumberField({ property }: { property: NodeProperty }) {
  const [field, , helpers] = useField(property.name);
  return (
    <div className="flex items-center gap-2">
      <input
        {...field}
        type="number"
        value={displayNumber(property, field.value ?? property.default)}
        onChange={(event) => helpers.setValue(storedNumber(property, event.target.value))}
        className="input input-bordered w-full bg-[#10182c] text-white text-sm rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
        min={displayNumber(property, property.min)}
        max={displayNumber(property, property.max)}
        step={displayNumber(property, property.step ?? 1)}
      />
      <span className="shrink-0 text-sm text-slate-400">{property.unit}</span>
    </div>
  );
}

export const NodeNumber = ({ property, values }: NodeNumberProps) => {
  const [field, , helpers] = useField(property.name);
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

  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : 'col-span-2'}`} key={property.name}>
      <FieldLabel
        label={property.displayName}
        helpText={getFieldHelpText(property)}
      />
      {property.unit ? (
        <UnitNumberField property={property} />
      ) : (
        <ThemedNumberInput
          name={property.name}
          value={field.value ?? property.default ?? ""}
          min={property?.min}
          max={property?.max}
          step={property?.step}
          placeholder={property?.placeholder}
          ariaLabel={property.displayName}
          onBlur={field.onBlur}
          onChange={(nextValue) => helpers.setValue(nextValue)}
        />
      )}
    </div>
  );
};
