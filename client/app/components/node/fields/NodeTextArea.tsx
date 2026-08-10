import { Field, ErrorMessage } from "formik";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";

interface NodeTextAreaProps {
  property: NodeProperty;
  values: any;
}

export const NodeTextArea = ({ property, values }: NodeTextAreaProps) => {
  const displayOptions = property?.displayOptions || {};
  const show = displayOptions.show || {};

  if (Object.keys(show).length > 0) {
    for (const [dependencyName, validValue] of Object.entries(show)) {
      const compare = (name: string, expected: any) => {
        const current = values[name];
        // "*" means the field only has to be filled in.
        if (expected === "*") {
          return current !== undefined && current !== null && current !== "";
        }
        return Array.isArray(expected) ? expected.includes(current) : current === expected;
      };

      // "_any" holds alternatives; matching one of them is enough.
      const matches =
        dependencyName === "_any" && validValue && typeof validValue === "object"
          ? Object.entries(validValue).some(([name, expected]) => compare(name, expected))
          : compare(dependencyName, validValue);

      if (!matches) {
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
      <Field
        as="textarea"
        name={property.name}
        placeholder={property.placeholder}
        rows={property.rows}
        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-[#10182c] border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-vertical"
        onMouseDown={(e: any) => e.stopPropagation()}
        onTouchStart={(e: any) => e.stopPropagation()}
      />
      <ErrorMessage
        name={property.name}
        component="div"
        className="text-red-400 text-sm mt-1"
      />
      {property.maxLength && (
        <div className="text-gray-400 text-xs mt-1">
          Characters: {property.value?.length.toLocaleString() || 0} /{" "}
          {property.maxLength.toLocaleString()}
        </div>
      )}
    </div>
  );
};
