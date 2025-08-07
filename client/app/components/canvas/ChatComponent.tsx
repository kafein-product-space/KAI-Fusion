import React, { useState, useEffect, useRef } from "react";
import { Eraser, History, MessageSquare } from "lucide-react";
import ChatBubble from "../common/ChatBubble";

interface ChatComponentProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatHistory: any[];
  chatError: string | null;
  chatLoading: boolean;
  chatInput: string;
  setChatInput: (input: string) => void;
  onSendMessage: () => void;
  onClearChat: () => void;
  onShowHistory: () => void;
  activeChatflowId: string | null;
}

export default function ChatComponent({
  chatOpen,
  setChatOpen,
  chatHistory,
  chatError,
  chatLoading,
  chatInput,
  setChatInput,
  onSendMessage,
  onClearChat,
  onShowHistory,
  activeChatflowId,
}: ChatComponentProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, chatLoading]);

  // Get chat title from first user message
  const getChatTitle = () => {
    if (!activeChatflowId || chatHistory.length === 0) {
      return "Yeni Konuşma";
    }

    const firstUserMessage = chatHistory.find((msg) => msg.role === "user");
    if (firstUserMessage) {
      const title = firstUserMessage.content.slice(0, 30);
      return title.length < firstUserMessage.content.length
        ? title + "..."
        : title;
    }

    return "Yeni Konuşma";
  };

  if (!chatOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 w-96 h-[520px] bg-[#18181A] rounded-xl shadow-2xl flex flex-col z-50 animate-slide-up border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-gray-200 text-sm truncate">
            {getChatTitle()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowHistory}
            className="text-gray-400 hover:text-gray-300 p-1 rounded hover:bg-gray-700"
            title="Konuşma geçmişi"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onClearChat}
            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-700"
            title="Konuşmayı temizle"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChatOpen(false)}
            className="text-gray-400 hover:text-gray-300 p-1 rounded hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatError && <div className="text-xs text-red-400">{chatError}</div>}
        {chatHistory
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
          .map((msg, i) => (
            <ChatBubble
              key={msg.id || i}
              from={msg.role === "user" ? "user" : "assistant"}
              message={msg.content}
              userInitial={msg.role === "user" ? "U" : undefined}
            />
          ))}
        {chatLoading && <ChatBubble from="assistant" message="" loading />}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 text-sm border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400"
          placeholder="Mesajınızı yazın..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSendMessage();
          }}
          disabled={chatLoading}
        />
        <button
          onClick={onSendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={chatLoading || !chatInput.trim()}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
