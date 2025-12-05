// Dynamically load all JSON files in the templates folder
const templateModules = import.meta.glob<{
  id: string;
  name: string;
  description: string;
  colorFrom: string;
  colorTo: string;
  icon: { name: string; path: string | null; alt: string | null };
  flow_data: any;
}>("./templates/*.json", { eager: true });

// Convert template files to array
export const prebuiltTemplates = Object.values(templateModules);

export type PrebuiltTemplate = (typeof prebuiltTemplates)[number];
