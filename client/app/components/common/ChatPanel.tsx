import React, { useState } from 'react';
import { useChatStore } from '../../stores/chat';

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { chats, addChat } = useChatStore();
  const [input, setInput] = useState('');

  const handleSendMessage = () => {
    if (input.trim()) {
      addChat({ id: Date.now(), message: input, sender: 'user' });
      // Here you would typically call an API to get a response
      // For now, we'll just simulate a response
      setTimeout(() => {
        addChat({ id: Date.now() + 1, message: 'This is an automated response.', sender: 'bot' });
      }, 1000);
      setInput('');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Chat
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Chatbot</h2>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">
          &times;
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto h-80">
        {chats.map((chat) => (
          <div key={chat.id} className={`my-2 ${chat.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block p-2 rounded-lg ${
                chat.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              {chat.message}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..."
          />
          <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel; 