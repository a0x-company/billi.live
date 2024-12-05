"use client";

import { useEffect, useRef, useState } from "react";

import { useParams } from "next/navigation";

// socket
import io, { Socket } from "socket.io-client";

// components
import Chart from "./chart";
import CreateToken from "./create-token";
import { TokenTrade } from "./token-trade";
import { ChatBox } from "../stream/chat-box";

// icons
import { Heart } from "lucide-react";

// constants
import { STREAMING_COUNTER_SERVER_URL } from "@/constants/stream";

const stream = {
  title: "Stream Title",
  viewerCount: 100,
  streamerName: "Streamer Name",
  description: "Stream Description",
};

// const size = isMobile ? `h-[467px] w-[320px]` : `h-[480px] w-[895px]`;

const socketUrl = STREAMING_COUNTER_SERVER_URL;

const TokenDetail = () => {
  const socketRef = useRef<Socket | null>(null);

  const { address } = useParams();

  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    console.log("Joining stream with streamId: ", address);

    socketRef.current = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      secure: true,
    });

    if (socketRef.current) {
      socketRef.current.on("connect", () => {
        if (socketRef.current) {
          console.log("Joining stream with streamId: ", address);

          socketRef.current.emit("joinStream", {
            streamId: address,
            handle: "handle",
          });
        }
      });

      socketRef.current.on("userCount", ({ count, users }) => {
        setUsers(users);
        setUserCount(count);
      });

      socketRef.current.on("comment", (comment: Comment) => {
        setComments((prevComments) => [...prevComments, comment]);
      });

      socketRef.current.on("previousComments", (prevComments: Comment[]) => {
        setComments(prevComments);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leaveStream", address);
        socketRef.current.off("userCount");
        socketRef.current.off("comment");
        socketRef.current.off("previousComments");
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="grid grid-cols-[320px_1fr] lg:grid-cols-[895px_1fr] gap-4 py-8">
      <div className="grid grid-cols-1 grid-rows-[655px_1fr] gap-4">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold mb-2">{stream.title}</h1>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-rose-500 font-medium flex items-center gap-1">
              <Heart className="w-4 h-4" /> {userCount} viewers
            </span>
            <span className="text-gray-200">{stream.streamerName}</span>
          </div>
          <p className="text-gray-200">{stream.description}</p>

          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-white">
              Stream Preview
            </div>
          </div>
        </div>

        <Chart tokenAddress="0x283024E266B46C7B52bc4BE4B1Fd0F232DEb219F" />
      </div>

      <div className="grid grid-cols-1 grid-rows-[655px_1fr] gap-4">
        <ChatBox />
        <TokenTrade />
      </div>
    </div>
  );
};

export default TokenDetail;
