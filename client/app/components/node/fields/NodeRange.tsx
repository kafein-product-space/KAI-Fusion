import { ErrorMessage, Field } from "formik";
import type { NodeProperty } from "../types";

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

  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : 'col-span-2'}`} key={property.name}>
      <label className="text-white text-sm font-medium mb-2 block">
        {property.displayName}:{" "}
        <span className={`text-${property.color || "blue-400"} font-mono`}>
          {values[property.name]}
        </span>
      </label>
      {property.hint && (
        <p className="text-slate-400 text-sm mt-1">{property.hint}</p>
      )}
      <Field
        name={property.name}
        type="range"
        min={property.min}
        max={property.max}
        step={property.step}
        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
        onMouseDown={(e: any) => e.stopPropagation()}
        onTouchStart={(e: any) => e.stopPropagation()}
      />
      <div className="flex justify-between text-sm text-gray-400 mt-2">
        <span>
          {property.minLabel} ({property.min})
        </span>
        <span>
          {property.maxLabel} ({property.max})
        </span>
      </div>
      <ErrorMessage
        name={property.name}
        component="div"
        className="text-red-400 text-sm mt-1"
      />
    </div>
  );
};
