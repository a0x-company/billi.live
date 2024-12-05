"use client";
import React, { useContext, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { format } from "date-fns";
import {
  FarcasterUser,
  FarcasterUserContext,
  LOCAL_STORAGE_KEYS,
} from "@/context/FarcasterUserContext";
import { QRCode } from "@farcaster/auth-kit";
import axios from "axios";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

export const ChatBox: React.FC = () => {
  const farcasterContext = useContext(FarcasterUserContext);
  const { farcasterUser, setFarcasterUser, isConnected, setIsConnected } =
    farcasterContext;

  const [isSignerWriter, setIsSignerWriter] = useState(false);
  const [openQrSigner, setOpenQrSigner] = useState(false);
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

  useEffect(() => {
    if (farcasterUser?.fid && farcasterUser.status === "approved") {
      setIsSignerWriter(true);
    }
  }, [farcasterUser]);

  const handleSendCast = async () => {
    try {
      const response = await axios.post("/api/cast", {
        signer_uuid: farcasterUser?.signer_uuid,
        text: newMessage.trim(),
      });
      console.log("response", response);
    } catch (error) {
      console.error("Error sending cast", error);
    }
  };

  const handleSendMessage = () => {
    if (!isSignerWriter) {
      setOpenQrSigner(true);
      return;
    }
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      user: "You",
      message: newMessage.trim(),
      timestamp: new Date(),
    };

    handleSendCast();

    setMessages([...messages, message]);
    setNewMessage("");
  };

  /* GET SIGNER STATUS */
  useEffect(() => {
    if (
      farcasterUser &&
      farcasterUser.status === "pending_approval" &&
      openQrSigner
    ) {
      let intervalId: NodeJS.Timeout;

      const startPolling = () => {
        intervalId = setInterval(async () => {
          try {
            const response = await axios.get(
              `/api/signer?signer_uuid=${farcasterUser?.signer_uuid}`
            );
            const user = response.data as FarcasterUser;

            if (user?.status === "approved") {
              // store the user in local storage
              localStorage.setItem(
                LOCAL_STORAGE_KEYS.FARCASTER_USER,
                JSON.stringify(user)
              );
              setFarcasterUser(user);
              setIsSignerWriter(true);
              setOpenQrSigner(false);
              const updateUser = async () => {
                await axios.put(
                  `/api/signer?signer_uuid=${farcasterUser?.signer_uuid}`,
                  user
                );
              };
              updateUser();
              clearInterval(intervalId);
            }
          } catch (error) {
            console.error("Error during polling", error);
          }
        }, 2000);
      };

      const stopPolling = () => {
        clearInterval(intervalId);
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          stopPolling();
        } else {
          startPolling();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Start the polling when the effect runs.
      startPolling();

      // Cleanup function to remove the event listener and clear interval.
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        clearInterval(intervalId);
      };
    }
  }, [farcasterUser, openQrSigner]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col h-full relative">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="font-semibold dark:text-white">Live Chat</h3>
      </div>

      {openQrSigner && farcasterUser?.signer_approval_url && (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full bg-black/50 backdrop-blur-sm gap-4">
          <h1>Scan the QR code to participate on the chat</h1>
          <div className="w-max h-max flex items-center justify-center bg-white rounded-lg px-4 pt-4 pb-2">
            <QRCode uri={farcasterUser?.signer_approval_url} />
          </div>
        </div>
      )}
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
