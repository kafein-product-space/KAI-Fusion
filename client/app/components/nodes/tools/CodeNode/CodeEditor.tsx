// CodeEditor.tsx
import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Info, CheckCircle, AlertTriangle } from "lucide-react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "python" | "javascript";
  theme?: "vs-dark" | "light" | "vs" | "hc-black";
  height?: string;
  readOnly?: boolean;
  fontSize?: number;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  minimap?: boolean;
  onExecute?: () => void;
  isExecuting?: boolean;
  executionResults?: {
    success: boolean;
    output?: any;
    error?: string;
    stdout?: string;
  };
}

// Python autocomplete suggestions
const pythonCompletionItems = [
  {
    label: "output",
    kind: "Variable",
    documentation: "Use this variable to return data from your code",
    insertText: 'output = {\n    "result": ${1}\n}',
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "result",
    kind: "Variable",
    documentation: "Alternative variable to return data from your code",
    insertText: "result = ${1}",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "items",
    kind: "Variable",
    documentation: "Access input items from connected nodes",
    insertText: "items",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "_now()",
    kind: "Function",
    documentation: "Get current timestamp",
    insertText: "_now()",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "_utcnow()",
    kind: "Function",
    documentation: "Get current UTC timestamp",
    insertText: "_utcnow()",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "for item in items:",
    kind: "Snippet",
    documentation: "Iterate over input items",
    insertText: "for item in items:\n    ${1:# Process each item}\n    pass",
    insertTextRules: "InsertAsSnippet",
  },
];

// JavaScript autocomplete suggestions
const javascriptCompletionItems = [
  {
    label: "output",
    kind: "Variable",
    documentation: "Use this variable to return data from your code",
    insertText: "output = {\n    result: ${1}\n};",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "result",
    kind: "Variable",
    documentation: "Alternative variable to return data from your code",
    insertText: "result = ${1};",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "items",
    kind: "Variable",
    documentation: "Access input items from connected nodes",
    insertText: "items",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "_now()",
    kind: "Function",
    documentation: "Get current timestamp",
    insertText: "_now()",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "_utcnow()",
    kind: "Function",
    documentation: "Get current UTC timestamp",
    insertText: "_utcnow()",
    insertTextRules: "InsertAsSnippet",
  },
  {
    label: "items.forEach",
    kind: "Snippet",
    documentation: "Iterate over input items",
    insertText: "items.forEach(item => {\n    ${1:// Process each item}\n});",
    insertTextRules: "InsertAsSnippet",
  },
];

export default function CodeEditor({
  value,
  onChange,
  language,
  theme = "vs-dark",
  height = "400px",
  readOnly = false,
  fontSize = 14,
  showLineNumbers = true,
  wordWrap = true,
  minimap = true,
  onExecute,
  isExecuting = false,
  executionResults,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Clear editor
  const handleClear = () => {
    onChange("");
  };

  // Format code
  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.trigger("", "editor.action.formatDocument");
    }
  };

  // Set up autocomplete when editor mounts
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Register completion provider
    const completionItems =
      language === "python" ? pythonCompletionItems : javascriptCompletionItems;

    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = completionItems.map((item: any) => ({
          ...item,
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column,
          },
        }));

        return { suggestions };
      },
    });

    // Add custom keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecute && onExecute();
    });

    // Add hover provider for custom functions
    monaco.languages.registerHoverProvider(language, {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (word) {
          const completionItem = completionItems.find(
            (item: any) => item.label === word.word
          );
          if (completionItem) {
            return {
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
              },
              contents: [
                { value: `**${completionItem.label}**` },
                { value: completionItem.documentation },
              ],
            };
          }
        }
        return null;
      },
    });
  };

  const getLanguageDisplayName = () => {
    return language === "python" ? "Python" : "JavaScript";
  };

  const getExecutionStatusIcon = () => {
    if (isExecuting) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
      );
    }

    if (executionResults) {
      return executionResults.success ? (
        <CheckCircle className="w-4 h-4 text-green-400" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-red-400" />
      );
    }

    return null;
  };

  return (
    <div className="relative">
      {/* Editor Header */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-600 rounded-t-lg px-4 py-2">
        <div className="flex items-center space-x-3">
          {/* Language Badge */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-500"></div>
            <span className="text-slate-300 text-sm font-medium">
              {getLanguageDisplayName()}
            </span>
          </div>

          {/* Line Count */}
          <div className="text-slate-500 text-xs">
            {value.split("\n").length} lines
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Execution Status */}
          <div className="flex items-center space-x-2 px-2">
            {getExecutionStatusIcon()}
            {isExecuting && (
              <span className="text-blue-400 text-xs">Running...</span>
            )}
            {executionResults && !isExecuting && (
              <span
                className={`text-xs ${
                  executionResults.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {executionResults.success ? "Success" : "Error"}
              </span>
            )}
          </div>

          <div className="w-px h-4 bg-slate-600"></div>

          {onExecute && (
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                isExecuting
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white shadow-lg hover:shadow-xl"
              }`}
              title="Execute Code (Ctrl+Enter)"
            >
              <div className="flex items-center space-x-1">
                {isExecuting ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                ) : (
                  null
                )}
                <span>{isExecuting ? "Running" : "Run"}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="border-l border-r border-slate-600">
        <Editor
          height={height}
          language={language}
          value={value}
          onChange={(val) => onChange(val || "")}
          onMount={handleEditorDidMount}
          theme={theme}
          options={{
            fontSize,
            lineNumbers: showLineNumbers ? "on" : "off",
            wordWrap: wordWrap ? "on" : "off",
            minimap: { enabled: minimap },
            readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            selectOnLineNumbers: true,
            roundedSelection: false,
            guides: {
              indentation: true,
              bracketPairs: true,
            },
            colorDecorators: true,
            codeLens: false,
            folding: true,
            foldingHighlight: true,
            foldingStrategy: "auto",
            showFoldingControls: "mouseover",
            matchBrackets: "always",
            glyphMargin: true,
            fixedOverflowWidgets: true,
            contextmenu: true,
            mouseWheelZoom: true,
            multiCursorModifier: "ctrlCmd",
            accessibilitySupport: "auto",
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: "never",
              seedSearchStringFromSelection: "never",
            },
            padding: { top: 16, bottom: 16 },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
              showVariables: true,
              showModules: true,
              showClasses: true,
              showInlineDetails: true,
              showStatusBar: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            parameterHints: {
              enabled: true,
              cycle: true,
            },
            hover: {
              enabled: true,
              delay: 300,
              sticky: true,
            },
          }}
        />
      </div>

      {/* Editor Footer */}
      <div className="bg-slate-800 border border-slate-600 rounded-b-lg px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4 text-slate-500">
            <span>UTF-8</span>
            <span>Spaces: 2</span>
            <span>Line Endings: LF</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-500">
            <div className="flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>Ctrl+Enter to run • Ctrl+/ to comment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Results Panel */}
      {executionResults && !isExecuting && (
        <div className="mt-4 bg-slate-900 border border-slate-600 rounded-lg">
          <div className="px-4 py-2 border-b border-slate-600 bg-slate-800">
            <div className="flex items-center space-x-2">
              {executionResults.success ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm font-medium text-white">
                {executionResults.success
                  ? "Execution Success"
                  : "Execution Error"}
              </span>
            </div>
          </div>

          <div className="p-4 max-h-48 overflow-auto">
            {executionResults.success ? (
              <div>
                {executionResults.output && (
                  <div className="mb-3">
                    <div className="text-xs text-slate-400 mb-1">Output:</div>
                    <pre className="bg-slate-800 p-3 rounded text-green-400 text-sm overflow-x-auto">
                      {JSON.stringify(executionResults.output, null, 2)}
                    </pre>
                  </div>
                )}
                {executionResults.stdout && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      Console Output:
                    </div>
                    <pre className="bg-slate-800 p-3 rounded text-slate-300 text-sm whitespace-pre-wrap">
                      {executionResults.stdout}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-xs text-slate-400 mb-1">Error:</div>
                <pre className="bg-red-900/20 border border-red-500/30 p-3 rounded text-red-400 text-sm whitespace-pre-wrap">
                  {executionResults.error}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
