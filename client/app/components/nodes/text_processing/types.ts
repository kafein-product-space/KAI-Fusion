export interface StringInputData {
  text_input: string;
}

export interface StringInputNodeProps {
  data: StringInputData;
  id: string;
  onExecute?: (id: string) => void;
  validationStatus?: "success" | "error" | null;
  isExecuting?: boolean;
  isActive?: boolean;
}