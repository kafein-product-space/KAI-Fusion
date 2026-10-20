import { useField } from "formik";
import type { NodeProperty } from "../types";
import { CalendarDays } from "lucide-react";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";
import { ThemedDateTimeInput } from "./ThemedDateTimeInput";

interface NodeDateTimeProps {
  property: NodeProperty;
  values: any;
}

export const NodeDateTime = ({ property, values }: NodeDateTimeProps) => {
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
      <div className="flex items-center space-x-2 mb-2">
        <CalendarDays className="h-4 w-4 text-[var(--kai-accent-text)]" />
        <FieldLabel
          label={property.displayName}
          helpText={getFieldHelpText(property)}
          className="mb-0 text-sm font-medium text-[var(--kai-text-soft)]"
        />
      </div>
      <ThemedDateTimeInput
        value={field.value}
        onChange={helpers.setValue}
        placeholder={property.placeholder ?? "Select date and time"}
      />
    </div>
  );
};
