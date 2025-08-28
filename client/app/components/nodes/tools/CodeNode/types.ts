// CodeNode types.ts

export interface CodeNodeData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Core configuration
  language: "python" | "javascript";
  mode: "all_items" | "each_item";
  code: string;
  timeout: number;
  continue_on_error: boolean;
  
  // Status and validation
  validationStatus?: "success" | "error" | "warning" | "pending";
  
  // Execution results
  execution_results?: {
    success: boolean;
    output?: any;
    error?: string;
    stdout?: string;
    execution_time?: number;
    documents?: any[];
  };
  
  // Activity indicators
  is_executing?: boolean;
  last_execution_time?: string;
  total_executions?: number;
  success_rate?: number;
  
  // Code editor preferences
  editor_preferences?: {
    theme?: "monokai" | "github" | "solarized";
    font_size?: number;
    show_line_numbers?: boolean;
    wrap_code?: boolean;
  };
}

export interface CodeNodeConfigFormProps {
  configData?: any;
  onSave?: (values: any) => void;
  onCancel: () => void;
  initialValues?: any;
  validate?: (values: any) => any;
  onSubmit?: (values: any) => void;
}

export interface CodeNodeVisualProps {
  data: CodeNodeData;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface CodeNodeProps {
  data: CodeNodeData;
  id: string;
}

// Language configuration
export const SUPPORTED_LANGUAGES = [
  {
    value: "python",
    label: "Python",
    description: "Execute Python code with secure sandbox",
    icon: "/icons/python-icon.svg",
    color: "from-blue-500 to-green-500",
    defaultCode: `# Python Example
# Process input data and return results

# Access input items
items = locals().get('items', [])

# Your code here
output = {
    'message': 'Hello from Python Code Node!',
    'timestamp': str(_now()),
    'processed_items': len(items),
    'items': items
}

# You can also use 'result' instead of 'output'
# result = output`
  },
  {
    value: "javascript", 
    label: "JavaScript",
    description: "Execute JavaScript code with Node.js",
    icon: "/icons/js-icon.png",
    color: "from-yellow-500 to-orange-500",
    defaultCode: `// JavaScript Example
// Process input data and return results

// Access input items
const items = typeof items !== 'undefined' ? items : [];

// Your code here
output = {
    message: 'Hello from JavaScript Code Node!',
    timestamp: new Date().toISOString(),
    processed_items: items.length,
    items: items
};

// You can also use 'result' instead of 'output'
// result = output;`
  }
] as const;

// Execution modes
export const EXECUTION_MODES = [
  {
    value: "all_items",
    label: "Run Once for All Items", 
    description: "Execute code once with all input items",
    icon: "Layers",
    use_case: "Batch processing, aggregation, summary operations"
  },
  {
    value: "each_item",
    label: "Run Once for Each Item",
    description: "Execute code separately for each input item", 
    icon: "RotateCcw",
    use_case: "Individual processing, transformation, validation"
  }
] as const;

// Editor themes
export const EDITOR_THEMES = [
  { value: "vs-dark", label: "VS Code Dark (Default)", preview: "#1e1e1e" },
  { value: "light", label: "VS Code Light", preview: "#ffffff" },
  { value: "hc-black", label: "High Contrast Dark", preview: "#000000" }
] as const;