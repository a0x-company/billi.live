"use client";

// react
import React, { useContext, useEffect, useRef, useState } from "react";

// icons
import { Send } from "lucide-react";

// utils
import { format } from "date-fns";

// context
import {
  FarcasterUser,
  FarcasterUserContext,
  LOCAL_STORAGE_KEYS,
} from "@/context/FarcasterUserContext";

// components
import { QRCode } from "@farcaster/auth-kit";

// axios
import axios from "axios";

// types
import { Comment } from "@/types";

// socket
import { Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export const ChatBox: React.FC<{
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  isConnectedRoom: React.MutableRefObject<boolean>;
  socketRef: React.MutableRefObject<Socket | null>;
}> = ({ comments, isConnectedRoom, setComments, socketRef }) => {
  const farcasterContext = useContext(FarcasterUserContext);
  const { farcasterUser, setFarcasterUser, isConnected, setIsConnected } =
    farcasterContext;

  const { address } = useParams();

  const [isSignerWriter, setIsSignerWriter] = useState(false);
  const [openQrSigner, setOpenQrSigner] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const commentsContainerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (farcasterUser?.fid && farcasterUser.status === "approved") {
      setIsSignerWriter(true);
    }
  }, [farcasterUser]);

  const handleSendMessage = () => {
    if (!isSignerWriter) {
      setOpenQrSigner(true);
      return;
    }
    if (!newMessage.trim() || !farcasterUser?.name || !farcasterUser?.pfpUrl)
      return;

    const message: Comment = {
      id: crypto.randomUUID(),
      handle: farcasterUser?.name,
      pfp: farcasterUser?.pfpUrl,
      comment: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    console.log("message", message);

    if (socketRef.current) {
      socketRef.current.emit("newComment", {
        streamId: address,
        ...message,
      });
    }

    setNewMessage("");
  };

  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop =
        commentsContainerRef.current.scrollHeight;
    }
  }, [comments]);
  // Check scroll position and update state
  useEffect(() => {
    const checkScrollPosition = () => {
      if (commentsContainerRef.current) {
        const { scrollHeight, scrollTop, clientHeight } =
          commentsContainerRef.current;

        // Use a small threshold to account for potential pixel-level discrepancies
        const atBottom = scrollHeight - scrollTop - clientHeight <= 20;
        setIsUserAtBottom(atBottom);
      }
    };

    const currentRef = commentsContainerRef.current;
    if (currentRef) {
      // Initial check
      checkScrollPosition();

      // Add scroll event listener
      currentRef.addEventListener("scroll", checkScrollPosition);

      // Cleanup listener
      return () => {
        currentRef.removeEventListener("scroll", checkScrollPosition);
      };
    }
  }, []);

  // Scroll to bottom method
  const handleScrollToBottom = () => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop =
        commentsContainerRef.current.scrollHeight;
    }
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
    <div className="bg-gray-800 rounded-lg shadow-md flex flex-col h-full relative">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">Live Chat</h3>
      </div>

      {!isConnected && newMessage.trim().length > 1 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full bg-black/50 backdrop-blur-sm gap-4">
          <h1>You are not connected to Farcaster 🔌</h1>
        </div>
      )}

      {openQrSigner && farcasterUser?.signer_approval_url && (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full bg-black/50 backdrop-blur-sm gap-4">
          <h1>Scan the QR code to participate on the chat</h1>
          <div className="w-max h-max flex items-center justify-center bg-white rounded-lg px-4 pt-4 pb-2">
            <QRCode uri={farcasterUser?.signer_approval_url} />
          </div>
        </div>
      )}

      <ul
        ref={commentsContainerRef}
        className="flex-1 p-4 space-y-4 overflow-y-scroll scrollbar-hidden relative"
      >
        {comments.map((msg) => (
          <li key={msg.id} className="flex flex-col">
            <div className="flex items-center gap-2">
              <Link
                href={`https://warpcast.com/${msg.handle}`}
                target="_blank"
                className="flex items-center gap-2"
              >
                <Image
                  src={msg.pfp}
                  alt={msg.handle}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="font-semibold text-sm text-white">
                  {msg.handle}
                </span>
              </Link>
              <span className="text-xs text-gray-400">
                {format(new Date(msg.timestamp), "HH:mm")}
              </span>
            </div>
            <p className="text-sm text-gray-300">{msg.comment}</p>
          </li>
        ))}
      </ul>

      {!isUserAtBottom && comments.length > 5 && (
        <button
          onClick={handleScrollToBottom}
          className="mb-2 w-40 self-center bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Scroll to bottom
        </button>
      )}

      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
