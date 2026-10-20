import { useField } from "formik";
import type { NodeProperty } from "../types";
import { ErrorMessage } from "formik";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";

interface NodeCheckboxProps {
  property: NodeProperty;
  values: any;
}

export const NodeCheckbox = ({ property, values }: NodeCheckboxProps) => {
  const [field, , helpers] = useField(property.name);
  const displayOptions = property?.displayOptions || {};
  const show = displayOptions.show || {};

  if (Object.keys(show).length > 0) {
    const compare = (name: string, expected: any) => {
      const current = values[name];
      if (expected === "*") {
        return current !== undefined && current !== null && current !== "";
      }
      return Array.isArray(expected) ? expected.includes(current) : current === expected;
    };

    for (const [dependencyName, validValue] of Object.entries(show)) {
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

  const isChecked = Boolean(field.value);

  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : 'col-span-2'}`} key={property.name}>
      <div className="flex items-center justify-between">
        <FieldLabel
          label={property.displayName}
          helpText={getFieldHelpText(property)}
          className="mb-0 text-sm text-[var(--kai-text-soft)]"
        />
        {/* Toggle Switch */}
        <button
          type="button"
          onClick={() => helpers.setValue(!isChecked)}
          onMouseDown={(e: any) => e.stopPropagation()}
          onTouchStart={(e: any) => e.stopPropagation()}
          className={`kai-node-toggle ${isChecked ? "is-active" : ""}`}
          role="switch"
          aria-checked={isChecked}
        >
          <span
            className="kai-node-toggle-thumb"
          />
        </button>
      </div>
      <ErrorMessage
        name={property.name}
        component="div"
        className="kai-node-field-error mt-1"
      />
    </div>
  );
};
