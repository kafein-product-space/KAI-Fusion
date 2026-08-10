import type { NodeProperty } from "../types";
import JSONEditor from "../../common/JSONEditor";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";

interface NodeJsonEditorProps {
  property: NodeProperty;
  values: any;
  setFieldValue: (name: string, value: any) => void;
}

export const NodeJsonEditor = ({
  property,
  values,
  setFieldValue,
}: NodeJsonEditorProps) => {
  const displayOptions = property?.displayOptions || {};
  const show = displayOptions.show || {};

  if (Object.keys(show).length > 0) {
    const compare = (name: string, expected: any) => {
      const current = values[name];
      // "*" means the field only has to be filled in.
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

  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : 'col-span-2'}`} key={property.name}>
      <FieldLabel
        label={property.displayName}
        helpText={getFieldHelpText(property)}
      />
      <JSONEditor
        value={values[property.name]}
        onChange={(value) => setFieldValue(property.name, value)}
        placeholder={property.placeholder}
      />
    </div>
  );
};
