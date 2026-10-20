import type { NodeProperty } from "../types";

interface NodeTitleProps {
  property: NodeProperty;
}

export const NodeTitle = ({ property }: NodeTitleProps) => {
  return (
    <div className={`${property?.colSpan ? `col-span-${property?.colSpan}` : 'col-span-2'}`} key={property.name}>
      <h3 className="text-sm font-medium text-[var(--kai-text)]">{property.displayName}</h3>
    </div>
  );
};
