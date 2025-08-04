import React from "react";
import { Bot } from "lucide-react";
import { useAuth } from "~/stores/auth";

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
          <span>{message}</span>
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
