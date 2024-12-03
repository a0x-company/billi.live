"use client";
import React, { useState } from "react";
import { Send } from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

export const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      user: "Alice",
      message: "Great stream!",
      timestamp: new Date(),
    },
    {
      id: "2",
      user: "Bob",
      message: "Thanks for sharing your knowledge!",
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      user: "You",
      message: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col h-full">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="font-semibold dark:text-white">Live Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm dark:text-white">
                {msg.user}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(msg.timestamp, "HH:mm")}
              </span>
            </div>
            <p className="text-sm dark:text-gray-300">{msg.message}</p>
          </div>
        ))}
      </div>

      <div className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSendMessage}
            className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
