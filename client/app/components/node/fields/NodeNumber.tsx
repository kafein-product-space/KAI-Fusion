import { useField } from "formik";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";
import { ThemedNumberInput } from "./ThemedNumberInput";

interface NodeNumberProps {
  property: NodeProperty;
  values: any;
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
    </div>
  );
};
