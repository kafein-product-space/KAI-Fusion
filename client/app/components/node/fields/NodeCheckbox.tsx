import { Field } from "formik";
import type { NodeProperty } from "../types";
import { ErrorMessage } from "formik";

interface NodeCheckboxProps {
  property: NodeProperty;
  values: any;
}

export const NodeCheckbox = ({ property, values }: NodeCheckboxProps) => {
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
      <label className="text-white text-sm font-medium mb-3 flex items-center gap-3">
        <Field
          name={property.name}
          type="checkbox"
          className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
          onMouseDown={(e: any) => e.stopPropagation()}
          onTouchStart={(e: any) => e.stopPropagation()}
        />
        <div className="text-white text-xs mt-2">
          <div className="font-medium">{property.displayName}</div>
          {property.hint && (
            <div className="text-xs text-slate-400">{property.hint}</div>
          )}
        </div>
      </label>
      <ErrorMessage
        name={property.name}
        component="div"
        className="text-red-400 text-sm mt-1"
      />
    </div>
  );
};
