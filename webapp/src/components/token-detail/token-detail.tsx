"use client";

// react
import { useContext, useEffect, useRef, useState } from "react";

// next
import Link from "next/link";

// socket
import io, { Socket } from "socket.io-client";

// react-query
import { useQuery } from "@tanstack/react-query";

// context
import { FarcasterUserContext } from "@/context/FarcasterUserContext";

// firebase

// components
import { LoadingSpinner } from "../spinner";
import { ChatBox } from "../stream/chat-box";
import StreamHost from "../stream/stream-host";
import StreamViewer from "../stream/stream-viewer";
import Chart from "./chart";
import { TokenTrade } from "./token-trade";

// icons
import { Heart } from "lucide-react";

// constants
import { STREAMING_COUNTER_SERVER_URL } from "@/constants/stream";
import { Comment, Livestream, LivestreamError } from "@/types";

const socketUrl = STREAMING_COUNTER_SERVER_URL;

const getLiveStremingByTokenAddress = async (
  address: string
): Promise<Livestream> => {
  try {
    const response = await fetch(`/api/livestream?address=${address}`);
    console.log("response", response);
    if (!response.ok) {
      throw new Error("Stream not found");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching stream:", error);
    if (error instanceof Error && error.message === "Stream not found") {
      throw new Error(LivestreamError.LIVESTREAM_NOT_FOUND);
    }
    throw new Error(LivestreamError.UNKNOWN_ERROR);
  }
};

const TokenDetail = ({ address }: { address: string }) => {
  const socketRef = useRef<Socket | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const isConnectedRoom = useRef(false);

  useEffect(() => {
    if (isConnectedRoom.current) return;
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
          isConnectedRoom.current = true;
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
  }, [address]);

  const { farcasterUser } = useContext(FarcasterUserContext);

  const {
    data: stream,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["stream", address],
    queryFn: () => getLiveStremingByTokenAddress(address as string),
    enabled: !!address,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const isStreamer = stream?.handle === farcasterUser?.handle;

  return (
    <div className="grid grid-cols-1 max-md:grid-rows-[auto_1fr_1fr_1fr] lg:grid-cols-[895px_1fr] gap-4 py-8 max-md:px-4">
      <div className="flex flex-col row-span-1 row-start-1 gap-4 lg:col-span-1 lg:col-start-1">
        {isLoading && (
          <>
            <div className="h-8 w-56 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-6 w-24 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-6 w-16 bg-gray-300 rounded animate-pulse"></div>
            </div>
            <div className="aspect-video bg-gray-300 rounded animate-pulse">
              <div className="w-full h-full flex items-center justify-center text-white">
                <LoadingSpinner size={48} />
              </div>
            </div>
          </>
        )}

        {error && error.message === LivestreamError.LIVESTREAM_NOT_FOUND && (
          <>
            <h1 className="text-2xl font-bold mb-2">Livestream not found</h1>
            <p className="text-gray-200">
              The stream for this token is not available.
            </p>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-rose-500 font-medium flex items-center gap-1">
                <Heart className="w-4 h-4" /> {userCount} viewers
              </span>
            </div>

            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <p className="w-full h-full flex items-center justify-center text-white">
                Livestream not found
              </p>
            </div>
          </>
        )}

        {/* TODO: Add stream component */}
        {/* While farcaster user is requested live rendering <StreamHost /> */}
        {/* Otherwise, render <StreamPreview /> */}
        {stream && (
          <>
            <h1 className="text-2xl font-bold mb-2">{stream.title}</h1>
            <p className="text-gray-200">{stream.description}</p>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-rose-500 font-medium flex items-center gap-1">
                <Heart className="w-4 h-4" /> {userCount}{" "}
                {userCount === 1 ? "viewer" : "viewers"}
              </span>
              <Link
                href={`https://warpcast.com/${stream.handle}`}
                target="_blank"
                className="text-gray-200"
              >
                {stream.handle}
              </Link>
            </div>

            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {isStreamer ? (
                <StreamHost stream={stream} />
              ) : (
                <StreamViewer stream={stream} />
              )}
            </div>
          </>
        )}
      </div>

      <div className="col-span-1 max-md:row-start-4 lg:col-span-1 lg:col-start-1">
        <Chart tokenAddress={address as string} />
      </div>

      <div className="col-span-1 max-md:row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
        <ChatBox
          comments={comments}
          setComments={setComments}
          isConnectedRoom={isConnectedRoom}
          socketRef={socketRef}
        />
      </div>
      <div className="col-span-1 max-md:row-start-3 flex-1 lg:col-span-1 lg:col-start-2 lg:row-start-2">
        {address && <TokenTrade tokenAddress={address as string} />}
      </div>
    </div>
  );
};

export default TokenDetail;
