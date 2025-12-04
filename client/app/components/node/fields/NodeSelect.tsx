import { Field } from "formik";
import type { NodeProperty } from "../types";

interface NodeSelectProps {
  property: NodeProperty;
  values: any;
}

export const NodeSelect = ({ property, values }: NodeSelectProps) => {
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
      <label className="text-white text-sm font-medium mb-2 block">
        {property.displayName}
      </label>
      <Field
        as="select"
        name={property.name}
        defaultValue={property?.default}
        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        onMouseDown={(e: any) => e.stopPropagation()}
        onTouchStart={(e: any) => e.stopPropagation()}
      >
        {property.options?.map((option: { label: string; value: string; hint: string }) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Field>
      {property.hint && (
        <p className="text-slate-400 text-sm mt-1">{property.hint}</p>
      )}
      {property.options?.find((option: { value: string }) => option.value === values[property.name])?.hint && (
        <p className="text-slate-400 text-xs bg-slate-900/30 mt-1">{property.options?.find((option: { value: string }) => option.value === values[property.name])?.hint}</p>
      )}
    </div>
  );
};
