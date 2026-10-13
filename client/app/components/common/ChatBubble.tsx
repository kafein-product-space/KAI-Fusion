import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bot,
  ExternalLink,
  Terminal,
  FileText,
  Quote,
} from "lucide-react";
import { useAuth } from "~/stores/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useClipboardFeedback } from "~/hooks/useClipboardFeedback";
interface ChatBubbleProps {
  message: string;
  from: "user" | "assistant";
  loading?: boolean;
  userAvatarUrl?: string;
  userInitial?: string;
  timestamp?: Date;
  messageId?: string;
  onEdit?: (messageId: string, newContent: string) => void;
  isEditing?: boolean;
  onSaveEdit?: (messageId: string, newContent: string) => void;
  onCancelEdit?: () => void;
  isBuilder?: boolean;
  isError?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  from,
  loading,
  userAvatarUrl,
  userInitial,
  timestamp,
  messageId,
  onEdit,
  isEditing,
  onSaveEdit,
  onCancelEdit,
  isBuilder,
  isError = false,
}) => {
  const { user } = useAuth();
  const { copy } = useClipboardFeedback();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [editContent, setEditContent] = useState(message);
  const isUser = from === "user";
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const hasLongError = isError && message.length > 320;
  const displayedError = hasLongError && !isErrorExpanded
    ? `${message.slice(0, 320).trimEnd()}…`
    : message;

  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);

  useLayoutEffect(() => {
    if (!isUser || !isEditing || !editTextareaRef.current) return;
    const textarea = editTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(56, Math.min(textarea.scrollHeight, 288))}px`;
  }, [editContent, isEditing, isUser]);

  const copyToClipboard = async (text: string, target: "message" | "code") => {
    if (!(await copy(text))) return;
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    if (target === "message") setCopiedMessage(true);
    else setCopiedCode(text);
    copyResetTimer.current = setTimeout(() => {
      setCopiedMessage(false);
      setCopiedCode(null);
      copyResetTimer.current = null;
    }, 2000);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = () => {
    if (messageId && onEdit) {
      onEdit(messageId, message);
    }
  };

  const handleSaveEdit = () => {
    if (messageId && onSaveEdit) {
      onSaveEdit(messageId, editContent);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message);
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <div
      className={`flex w-full my-3 px-2 sm:px-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex flex-col items-center mr-2 sm:mr-3 flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          {timestamp && (
            <span className="text-xs text-gray-400 mt-1 hidden sm:block">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
      )}

      <div className={`group flex min-w-0 max-w-[calc(100%-3rem)] sm:max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"} ${isUser && isEditing ? "w-full" : ""}`}>
      <div
        className={`relative max-w-full rounded-2xl text-sm ${isUser && isEditing
          ? "w-full bg-[#2f2f2f] text-[#f4f4f4] border border-[#424242] px-3 sm:px-4 py-3 sm:py-4 shadow-sm focus-within:border-[#707070]"
          : "w-fit px-3 sm:px-4 py-2 sm:py-3 shadow-lg transition-all duration-200 hover:shadow-xl"}
        ${
          isUser && isEditing
            ? ""
          : isUser
            ? isBuilder
              ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-br-md border border-purple-400"
              : "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md border border-blue-400"
            : isError
              ? "bg-red-950/90 text-red-50 rounded-bl-md border border-red-500/70 shadow-red-950/40"
              : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
        }
        `}
      >
        {loading && !isUser ? (
          <div className="flex items-center gap-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
              <div
                className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <span className="italic text-gray-600 font-medium">
              Thinking...
            </span>
          </div>
        ) : (
          <div className="w-full">
            {isUser && isEditing ? (
              <div className="flex flex-col gap-4">
                <textarea
                  ref={editTextareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  aria-label="Edit message"
                  className="block w-full min-h-14 max-h-72 resize-none overflow-y-auto border-0 bg-transparent px-1 py-0 text-sm leading-relaxed text-[#f4f4f4] outline-none placeholder:text-[#9b9b9b] focus:outline-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="min-h-9 rounded-full px-4 text-sm font-medium text-[#f4f4f4] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="min-h-9 rounded-full bg-white px-4 text-sm font-semibold text-[#212121] transition-colors hover:bg-[#e7e7e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : isUser ? (
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {message}
              </div>
            ) : isError ? (
              <div className="w-full">
                <div className="whitespace-pre-wrap break-words leading-relaxed text-red-50">
                  {displayedError}
                </div>
                {hasLongError && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-red-200 hover:text-white underline underline-offset-2"
                    aria-expanded={isErrorExpanded}
                    onClick={() => setIsErrorExpanded((expanded) => !expanded)}
                  >
                    {isErrorExpanded ? "Hide details" : "Show details"}
                  </button>
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none prose-slate break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={{
                    // Code blocks
                    code: ({ className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const language = match ? match[1] : "";
                      const isInline = !match;
                      const codeContent = String(children).replace(/\n$/, "");

                      return !isInline ? (
                        <div className="relative group my-4 sm:my-6 rounded-xl shadow-lg border border-gray-200 w-full overflow-hidden">
                          {/* Header with language and copy button */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-900 text-gray-100 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-700">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Terminal className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span className="text-sm font-medium capitalize text-gray-200 truncate">
                                {language || "plaintext"}
                              </span>
                              {language && (
                                <span className="hidden sm:inline text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full">
                                  {language}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => copyToClipboard(codeContent, "code")}
                              type="button"
                              aria-label={copiedCode === codeContent ? "Copied code" : "Copy code"}
                              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium group-hover:shadow-md flex-shrink-0"
                            >
                              <span
                                className={`chat-action-icon h-3 w-3 sm:h-4 sm:w-4 ${copiedCode === codeContent ? "chat-action-icon--check text-green-400" : "chat-action-icon--copy"}`}
                                aria-hidden="true"
                              />
                              <span className="text-xs">{copiedCode === codeContent ? "Copied" : "Copy"}</span>
                            </button>
                          </div>

                          {/* Syntax highlighted code */}
                          <div className="bg-gray-950 overflow-x-auto">
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={language || "text"}
                              customStyle={{
                                margin: 0,
                                padding: "1rem",
                                fontSize: "0.75rem",
                                lineHeight: "1.4",
                                background: "transparent",
                                borderRadius: 0,
                              }}
                              showLineNumbers={
                                codeContent.split("\n").length > 5
                              }
                              lineNumberStyle={{
                                color: "#6b7280",
                                fontSize: "0.7rem",
                                marginRight: "0.5rem",
                                userSelect: "none",
                              }}
                              wrapLongLines={false}
                            >
                              {codeContent}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      ) : (
                        <code
                          className={`${isBuilder ? "bg-purple-950/30 text-purple-400 border-purple-500/20" : "bg-blue-50 text-blue-700 border-blue-200"} px-2 py-1 rounded-md text-sm font-mono border font-medium`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },

                    // White background for preformatted text
                    pre: ({ children }: any) => (
                      <pre className="bg-white max-w-full overflow-x-auto p-3 rounded-lg text-sm ">
                        {children}
                      </pre>
                    ),

                    // Heading hierarchy
                    h1: ({ children }: any) => (
                      <h1 className="text-xl font-bold mb-4 text-gray-900 pb-3 border-b-2 border-gradient-to-r from-blue-500 to-purple-600 relative">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {children}
                        </span>
                      </h1>
                    ),
                    h2: ({ children }: any) => (
                      <h2 className="text-lg font-bold mb-3 text-gray-900 mt-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></span>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }: any) => (
                      <h3 className="text-md font-semibold mb-3 text-gray-800 mt-5 flex items-center gap-2">
                        <span className="w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></span>
                        {children}
                      </h3>
                    ),
                    h4: ({ children }: any) => (
                      <h4 className="text-md font-semibold mb-2 text-gray-700 mt-4 flex items-center gap-2">
                        <span className="w-0.5 h-4 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></span>
                        {children}
                      </h4>
                    ),

                    // Lists
                    ul: ({ children }: any) => (
                      <ul className="mb-4 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }: any) => (
                      <ol className="mb-4 space-y-1 counter-reset-list">
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }: any) => {
                      const isOrderedList =
                        props.className?.includes("ordered") ||
                        (typeof children === "object" &&
                          children?.props?.ordered);

                      return isOrderedList ? (
                        <li className="flex items-start gap-3 pl-2 leading-relaxed text-gray-700">
                          <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shadow-sm counter-increment">
                            •
                          </span>
                          <div className="flex-1 pt-0.5 text-left">{children}</div>
                        </li>
                      ) : (
                        <li className="flex items-start gap-3 pl-2 leading-relaxed text-gray-700">
                          <span className="flex-shrink-0 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-2.5 shadow-sm"></span>
                          <div className="flex-1 text-left">{children}</div>
                        </li>
                      );
                    },

                    // Links with an external-link icon
                    a: ({ href, children }: any) => (
                      <a
                        href={href}
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 transition-colors duration-200 break-all max-w-full"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="break-all">{children}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ),

                    // Blockquotes
                    blockquote: ({ children }: any) => (
                      <blockquote className="relative my-4 sm:my-6 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm -mx-2 sm:mx-0">
                        <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                          <Quote className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400 opacity-60" />
                        </div>
                        <div className="pl-6 sm:pl-8">
                          <div className="text-blue-600 text-xs sm:text-sm font-semibold mb-2 uppercase tracking-wide">
                            Quote
                          </div>
                          <div className="text-gray-700 italic leading-relaxed text-sm sm:text-base">
                            {children}
                          </div>
                        </div>
                        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4">
                          <Quote className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300 opacity-40 rotate-180" />
                        </div>
                      </blockquote>
                    ),

                    // Responsive tables
                    table: ({ children }: any) => (
                      <div className="overflow-x-auto my-4 sm:my-6 rounded-xl border border-gray-200 shadow-lg bg-white -mx-2 sm:mx-0">
                        <table className="min-w-full text-xs sm:text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }: any) => (
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        {children}
                      </thead>
                    ),
                    th: ({ children }: any) => (
                      <th className="px-3 sm:px-6 py-2 sm:py-4 text-left font-semibold text-gray-900 border-b border-gray-200 first:rounded-tl-xl last:rounded-tr-xl">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 hidden sm:block" />
                          <span className="truncate">{children}</span>
                        </div>
                      </th>
                    ),
                    tbody: ({ children }: any) => (
                      <tbody className="divide-y divide-gray-100">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }: any) => (
                      <tr className="hover:bg-gray-50 transition-colors duration-150">
                        {children}
                      </tr>
                    ),
                    td: ({ children }: any) => (
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-700 leading-relaxed text-xs sm:text-sm">
                        <div
                          className="truncate max-w-[200px] sm:max-w-none"
                          title={typeof children === "string" ? children : ""}
                        >
                          {children}
                        </div>
                      </td>
                    ),

                    // Paragraph spacing
                    p: ({ children }: any) => (
                      <p className="mb-3 last:mb-0 text-gray-700 leading-relaxed break-words overflow-wrap-anywhere">
                        {children}
                      </p>
                    ),

                    // Emphasis
                    strong: ({ children }: any) => (
                      <strong className="font-bold text-gray-900 inline">
                        {children}
                      </strong>
                    ),
                    em: ({ children }: any) => (
                      <em className="italic text-gray-600">{children}</em>
                    ),

                    // Divider
                    hr: () => <hr className="border-gray-300 my-6" />,

                    // Responsive images
                    img: ({ src, alt }: any) => (
                      <img
                        src={src}
                        alt={alt}
                        className="max-w-full h-auto rounded-lg shadow-md my-3"
                        loading="lazy"
                      />
                    ),

                    // Math formulas
                    div: ({ className, children, ...props }: any) => {
                      if (className === "math math-display") {
                        return (
                          <div className="my-4 text-center bg-gray-50 p-3 rounded-lg border">
                            <div className={className} {...props}>
                              {children}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className={className} {...props}>
                          {children}
                        </div>
                      );
                    },

                    // Inline math
                    span: ({ className, children, ...props }: any) => {
                      if (className === "math math-inline") {
                        return (
                          <span className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                            <span className={className} {...props}>
                              {children}
                            </span>
                          </span>
                        );
                      }
                      return (
                        <span className={className} {...props}>
                          {children}
                        </span>
                      );
                    },
                  }}
                >
                  {message}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && !isEditing && message && (
        <div className={`chat-message-actions mt-1 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${isUser ? "justify-end" : "justify-start"}`}>
          <button
            type="button"
            onClick={() => copyToClipboard(message, "message")}
            title={copiedMessage ? "Copied" : "Copy"}
            aria-label={copiedMessage ? "Copied" : "Copy"}
            className="chat-message-action"
          >
            <span className={`chat-action-icon h-4 w-4 ${copiedMessage ? "chat-action-icon--check" : "chat-action-icon--copy"}`} aria-hidden="true" />
          </button>
          {isUser && messageId && onEdit && (
            <button
              type="button"
              onClick={handleEdit}
              title="Edit"
              aria-label="Edit"
              className="chat-message-action"
            >
              <span className="chat-action-icon chat-action-icon--edit h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex flex-col items-center ml-2 sm:ml-3 flex-shrink-0">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="User"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-lg border-2 border-white"
            />
          ) : (
            <div className={`w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br ${isBuilder ? "from-purple-500 to-purple-600" : "from-blue-500 to-blue-600"} rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white text-xs sm:text-sm`}>
              {user?.full_name?.[0]?.toUpperCase() ||
                userInitial?.toUpperCase() ||
                "U"}
            </div>
          )}
          {timestamp && (
            <span className="text-xs text-gray-400 mt-1 hidden sm:block">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
