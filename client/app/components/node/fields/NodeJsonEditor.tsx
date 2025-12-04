import type { NodeProperty } from "../types";
import JSONEditor from "../../common/JSONEditor";

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
      <JSONEditor
        value={values[property.name]}
        onChange={(value) => setFieldValue(property.name, value)}
        placeholder={property.placeholder}
        description={property.hint}
      />
    </div>
  );
};
