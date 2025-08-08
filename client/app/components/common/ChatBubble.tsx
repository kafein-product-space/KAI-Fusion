import React, { useState } from "react";
import { Bot, Copy, Check, ExternalLink } from "lucide-react";
import { useAuth } from "~/stores/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

interface ChatBubbleProps {
  message: string;
  from: "user" | "assistant";
  loading?: boolean;
  userAvatarUrl?: string;
  userInitial?: string;
  timestamp?: Date;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  from,
  loading,
  userAvatarUrl,
  userInitial,
  timestamp,
}) => {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isUser = from === "user";

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (err) {
      console.error("Kopyalama başarısız:", err);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex w-full my-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex flex-col items-center mr-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {timestamp && (
            <span className="text-xs text-gray-400 mt-1">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
      )}

      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-lg text-sm
        ${
          isUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md border border-blue-400"
            : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
        }
        relative transition-all duration-200 hover:shadow-xl`}
      >
        {loading && !isUser ? (
          <div className="flex items-center gap-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <span className="italic text-gray-500">Düşünüyor...</span>
          </div>
        ) : (
          <div className="w-full">
            {isUser ? (
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {message}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none prose-slate">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                  components={{
                    // Kod blokları - kopyala butonu ile
                    code: ({ className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const language = match ? match[1] : "";
                      const isInline = !match;
                      const codeContent = String(children).replace(/\n$/, "");

                      return !isInline ? (
                        <div className="relative group my-4">
                          <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 rounded-t-lg text-xs font-medium">
                            <span className="capitalize">
                              {language || "text"}
                            </span>
                            <button
                              onClick={() => copyToClipboard(codeContent)}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors duration-200"
                            >
                              {copiedCode === codeContent ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span className="text-xs">
                                {copiedCode === codeContent
                                  ? "Kopyalandı!"
                                  : "Kopyala"}
                              </span>
                            </button>
                          </div>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto text-sm border-t border-gray-700">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      ) : (
                        <code
                          className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono border font-semibold"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },

                    // Başlıklar - daha iyi hiyerarşi
                    h1: ({ children }: any) => (
                      <h1 className="text-xl font-bold mb-3 text-gray-900 border-b-2 border-gray-200 pb-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }: any) => (
                      <h2 className="text-lg font-bold mb-2 text-gray-900 mt-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }: any) => (
                      <h3 className="text-base font-semibold mb-2 text-gray-800 mt-3">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }: any) => (
                      <h4 className="text-sm font-semibold mb-1 text-gray-700">
                        {children}
                      </h4>
                    ),

                    // Listeler - daha iyi styling
                    ul: ({ children }: any) => (
                      <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 ml-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }: any) => (
                      <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700 ml-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }: any) => (
                      <li className="leading-relaxed">{children}</li>
                    ),

                    // Linkler - dış bağlantı ikonu ile
                    a: ({ href, children }: any) => (
                      <a
                        href={href}
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 transition-colors duration-200"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ),

                    // Alıntılar - daha şık tasarım
                    blockquote: ({ children }: any) => (
                      <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600 my-3 bg-blue-50 py-3 rounded-r-lg shadow-sm">
                        <div className="not-italic text-blue-600 text-xs font-semibold mb-1">
                          Alıntı
                        </div>
                        {children}
                      </blockquote>
                    ),

                    // Tablolar - daha responsive
                    table: ({ children }: any) => (
                      <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 shadow-sm">
                        <table className="min-w-full text-xs bg-white">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }: any) => (
                      <th className="border-b-2 border-gray-200 px-4 py-3 bg-gray-50 font-semibold text-gray-900 text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }: any) => (
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-700">
                        {children}
                      </td>
                    ),

                    // Paragraflar - daha iyi spacing
                    p: ({ children }: any) => (
                      <p className="mb-3 last:mb-0 text-gray-700 leading-relaxed">
                        {children}
                      </p>
                    ),

                    // Vurgu metinleri
                    strong: ({ children }: any) => (
                      <strong className="font-bold text-gray-900">
                        {children}
                      </strong>
                    ),
                    em: ({ children }: any) => (
                      <em className="italic text-gray-600">{children}</em>
                    ),

                    // Çizgi
                    hr: () => <hr className="border-gray-300 my-6" />,

                    // Resimler - responsive
                    img: ({ src, alt }: any) => (
                      <img
                        src={src}
                        alt={alt}
                        className="max-w-full h-auto rounded-lg shadow-md my-3"
                        loading="lazy"
                      />
                    ),

                    // Matematik formülleri için
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

                    // Inline matematik
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

      {/* User Avatar */}
      {isUser && (
        <div className="flex flex-col items-center ml-3">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="User"
              className="w-9 h-9 rounded-full object-cover shadow-lg border-2 border-white"
            />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white">
              {user?.full_name?.[0]?.toUpperCase() ||
                userInitial?.toUpperCase() ||
                "U"}
            </div>
          )}
          {timestamp && (
            <span className="text-xs text-gray-400 mt-1">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
