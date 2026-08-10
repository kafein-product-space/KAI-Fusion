import { Field } from "formik";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";

interface NodeNumberProps {
  property: NodeProperty;
  values: any;
}

export const NodeNumber = ({ property, values }: NodeNumberProps) => {
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
        type="number"
        defaultValue={property?.default}
        name={property.name}
        className="input input-bordered w-full bg-[#10182c] text-white text-sm rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
        min={property?.min}
        max={property?.max}
      />
    </div>
  );
};
