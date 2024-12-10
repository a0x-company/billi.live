"use client";

// react
import { useContext, useEffect, useRef, useState } from "react";

// next
import Link from "next/link";
import Image from "next/image";

// socket
import io, { Socket } from "socket.io-client";

// react-query
import { useQuery } from "@tanstack/react-query";

// context
import { FarcasterUserContext } from "@/context/FarcasterUserContext";

// components
import { LoadingSpinner } from "../spinner";
import { ChatBox } from "../stream/chat-box";
import StreamHost from "../stream/stream-host";
import StreamViewer from "../stream/stream-viewer";
import Chart from "./chart";
import { TokenTrade } from "./token-trade";
import { AgentViewer } from "../stream/agent-viewer";
// icons
import { Heart } from "lucide-react";

// constants
import { STREAMING_COUNTER_SERVER_URL } from "@/constants/stream";

// types
import { Comment, Livestream, LivestreamError } from "@/types";

const socketUrl = STREAMING_COUNTER_SERVER_URL;

const getLiveStremingByTokenAddress = async (
  address: string
): Promise<Livestream> => {
  try {
    const response = await fetch(`/api/livestream?address=${address}`);
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const isConnectedRoom = useRef(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentText, setCurrentText] = useState<string>("");

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

  const { farcasterUser } = useContext(FarcasterUserContext);

  const isStreamer = stream?.handle === farcasterUser?.name;

  const isStreamedByAgent = stream?.streamedByAgent;

  useEffect(() => {
    if (!hasInteracted) return;
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

      socketRef.current.on("new-audio", ({ audio, text }) => {
        setCurrentText(text);

        const audioData = atob(audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < audioData.length; i++) {
          uint8Array[i] = audioData.charCodeAt(i);
        }

        const blob = new Blob([uint8Array], { type: "audio/mp3" });
        const audioUrl = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(console.error);
        }

        const agentComment: Comment = {
          id: crypto.randomUUID(),
          handle: stream?.handle || "billi",
          pfp: "/assets/stream/billi-pfp.png",
          comment: text,
          timestamp: new Date().toISOString(),
        };

        setComments((prevComments) => [...prevComments, agentComment]);

        audioRef.current?.addEventListener("ended", () => {
          URL.revokeObjectURL(audioUrl);
          setTimeout(() => setCurrentText(""), 1000);
        });
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
  }, [address, hasInteracted, stream?.handle]);

  if (!hasInteracted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <button
          onClick={() => setHasInteracted(true)}
          className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Start Stream and Audio
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[320px_1fr] lg:grid-cols-[895px_1fr] gap-4 py-8">
      <audio ref={audioRef} className="hidden" />
      <div className="grid grid-cols-1 grid-rows-[655px_1fr] gap-4">
        <div className="flex flex-col gap-4">
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
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white">
                      {stream.title}
                    </h1>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">
                      {stream.description}
                    </p>
                  </div>

                  <Link
                    href={`https://warpcast.com/${stream.handle}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <Image
                      src={"/assets/stream/billi-pfp.png"}
                      alt="avatar of the streamer"
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <span className="text-gray-200">@{stream.handle}</span>
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400">
                    <Heart className="w-4 h-4" />
                    <span className="font-medium">
                      {userCount} {userCount === 1 ? "viewer" : "viewers"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {isStreamedByAgent ? (
                  <AgentViewer
                    handle={stream.handle as string}
                    currentText={currentText}
                  />
                ) : isStreamer ? (
                  <StreamHost stream={stream} />
                ) : (
                  <StreamViewer stream={stream} />
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex row-span-2 flex-col gap-4">
          <Chart tokenAddress={address as string} />
        </div>
      </div>

      <div className="grid grid-cols-1 grid-rows-[655px_1fr] gap-4">
        <ChatBox
          comments={comments}
          setComments={setComments}
          isConnectedRoom={isConnectedRoom}
          socketRef={socketRef}
        />
        {address && <TokenTrade tokenAddress={address as string} />}
      </div>
    </div>
  );
};

export default TokenDetail;
