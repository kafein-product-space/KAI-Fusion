import React from "react";
import { Bot } from "lucide-react";
import { useAuth } from "~/stores/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatBubbleProps {
  message: string;
  from: "user" | "assistant";
  loading?: boolean;
  userAvatarUrl?: string;
  userInitial?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  from,
  loading,
  userAvatarUrl,
  userInitial,
}) => {
  const { user } = useAuth();
  const isUser = from === "user";

  return (
    <div
      className={`flex w-full my-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Avatar/Bot icon */}
      {!isUser && (
        <div className="flex items-end mr-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-md text-sm font-medium
        ${
          isUser
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }
        flex items-center gap-2 min-h-[40px] relative`}
      >
        {loading && !isUser ? (
          <>
            <Bot className="w-5 h-5 text-primary animate-bounce mr-2" />
            <span className="italic text-gray-500">thinking...</span>
          </>
        ) : (
          <div className="w-full">
            {isUser ? (
              <span>{message}</span>
            ) : (
              <div className="prose prose-sm max-w-none prose-gray">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Code blocks
                    code: ({ className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match;
                      return !isInline ? (
                        <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs border border-gray-600">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code
                          className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono border"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    // Headers
                    h1: ({ children }: any) => (
                      <h1 className="text-lg font-bold mb-2 text-gray-900">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }: any) => (
                      <h2 className="text-base font-bold mb-2 text-gray-900">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }: any) => (
                      <h3 className="text-sm font-bold mb-1 text-gray-900">
                        {children}
                      </h3>
                    ),
                    // Lists
                    ul: ({ children }: any) => (
                      <ul className="list-disc list-inside mb-2 space-y-1 text-gray-700">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }: any) => (
                      <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-700">
                        {children}
                      </ol>
                    ),
                    // Links
                    a: ({ href, children }: any) => (
                      <a
                        href={href}
                        className="text-blue-600 hover:text-blue-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    // Blockquotes
                    blockquote: ({ children }: any) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2 bg-gray-50 py-2 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    // Tables
                    table: ({ children }: any) => (
                      <div className="overflow-x-auto my-2">
                        <table className="min-w-full border border-gray-300 text-xs">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }: any) => (
                      <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-gray-900">
                        {children}
                      </th>
                    ),
                    td: ({ children }: any) => (
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {children}
                      </td>
                    ),
                    // Paragraphs
                    p: ({ children }: any) => (
                      <p className="mb-2 last:mb-0 text-gray-700 leading-relaxed">
                        {children}
                      </p>
                    ),
                    // Strong text
                    strong: ({ children }: any) => (
                      <strong className="font-semibold text-gray-900">
                        {children}
                      </strong>
                    ),
                    // Emphasis
                    em: ({ children }: any) => (
                      <em className="italic text-gray-700">{children}</em>
                    ),
                    // Horizontal rule
                    hr: () => <hr className="border-gray-300 my-4" />,
                  }}
                >
                  {message}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
      {/* User avatar */}
      {isUser && (
        <div className="flex items-end ml-2">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="User"
              className="w-8 h-8 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {user?.full_name?.[0] || "U"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
