import { Field, ErrorMessage, useFormikContext } from "formik";
import type { NodeProperty } from "../types";
import { useState, useRef, useEffect, useCallback } from "react";

interface NodeCodeEditorProps {
    property: NodeProperty;
    values: any;
}

export const NodeCodeEditor = ({ property, values }: NodeCodeEditorProps) => {
    const { setFieldValue } = useFormikContext();
    const [lineCount, setLineCount] = useState(1);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    const displayOptions = property?.displayOptions || {};
    const show = displayOptions.show || {};

    // Check display conditions
    if (Object.keys(show).length > 0) {
        for (const [dependencyName, validValue] of Object.entries(show)) {
            const dependencyValue = values[dependencyName];
            if (dependencyValue !== validValue) {
                return null;
            }
        }
    }

    // Update line count when value changes
    const updateLineCount = useCallback((text: string) => {
        const lines = (text || "").split("\n").length;
        setLineCount(Math.max(lines, 1));
    }, []);

    // Sync scroll between line numbers and textarea
    const handleScroll = useCallback(() => {
        if (lineNumbersRef.current && textareaRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }, []);

    // Initialize line count
    useEffect(() => {
        const currentValue = values[property.name] || property.default || "";
        updateLineCount(currentValue);
    }, [values, property.name, property.default, updateLineCount]);

    // Handle text change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setFieldValue(property.name, newValue);
        updateLineCount(newValue);
    };

    // Handle tab key for code editing
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;

                // Insert 2 spaces for tab
                const newValue = value.substring(0, start) + "  " + value.substring(end);
                setFieldValue(property.name, newValue);

                // Set cursor position after the inserted spaces
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 2;
                }, 0);
            }
        }
    };

    // Generate line numbers
    const renderLineNumbers = () => {
        const numbers = [];
        for (let i = 1; i <= lineCount; i++) {
            numbers.push(
                <div
                    key={i}
                    className="text-right pr-3 text-slate-500 select-none leading-6 text-xs"
                    style={{ height: "24px" }}
                >
                    {i}
                </div>
            );
        }
        return numbers;
    };

    return (
        <div
            className={`${property?.colSpan ? `col-span-${property?.colSpan}` : "col-span-2"}`}
            key={property.name}
        >
            <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                {property.displayName}
            </label>

            {/* Code Editor Container */}
            <div className="relative flex rounded-lg border border-gray-600 bg-slate-900/80 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                {/* Line Numbers */}
                <div
                    ref={lineNumbersRef}
                    className="flex-shrink-0 bg-slate-800/50 py-3 px-2 overflow-hidden border-r border-gray-700"
                    style={{
                        minWidth: "48px",
                        maxHeight: `${(property.rows || 12) * 24}px`,
                    }}
                >
                    {renderLineNumbers()}
                </div>

                {/* Code Textarea */}
                <textarea
                    ref={textareaRef}
                    name={property.name}
                    value={values[property.name] || ""}
                    onChange={handleChange}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    placeholder={property.placeholder}
                    rows={property.rows || 12}
                    className="flex-1 text-sm text-white font-mono px-4 py-3 bg-transparent resize-none focus:outline-none leading-6"
                    style={{
                        lineHeight: "24px",
                        tabSize: 2,
                    }}
                    spellCheck={false}
                    onMouseDown={(e: any) => e.stopPropagation()}
                    onTouchStart={(e: any) => e.stopPropagation()}
                />
            </div>

            <ErrorMessage
                name={property.name}
                component="div"
                className="text-red-400 text-sm mt-1"
            />

            {property.hint && (
                <p className="text-slate-400 text-sm mt-1">{property.hint}</p>
            )}

            {property.maxLength && (
                <div className="text-gray-400 text-xs mt-1">
                    Characters: {(values[property.name]?.length || 0).toLocaleString()} /{" "}
                    {property.maxLength.toLocaleString()}
                </div>
            )}
        </div>
    );
};
