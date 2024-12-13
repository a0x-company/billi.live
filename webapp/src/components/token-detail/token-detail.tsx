"use client";

// react
import { useContext, useEffect, useMemo, useRef, useState } from "react";

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
import StreamHost, { StreamHostProps } from "../stream/stream-host";
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

// const stream = {
//   handle: "heybilli",
//   tokenAddress: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
//   title: "Talking with fans",
//   livepeerInfo: {
//     embeaddableBroadcastUrl: "https://lvpr.tv/broadcast/b7df-70rg-x6d1-ag4j",
//     srtIngestUrl: "srt://rtmp.livepeer.com:2935?streamid=b7df-70rg-x6d1-ag4j",
//     playbackUrl: "https://livepeercdn.studio/hls/b7dfnuax4kzrf9uo/index.m3u8",
//     streamKey: "b7df-70rg-x6d1-ag4j",
//     streamId: "b7df7430-ceb6-41bb-87fb-e4f3455a4ed1",
//   },
//   createdAt: {
//     _seconds: 1733764602,
//     _nanoseconds: 819000000,
//   },
//   description: "Talk with frens",
//   status: "live",
//   streamedByAgent: true,
//   pfpUrl:
//     "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/c25730b6-e1db-45ff-e874-f72d5dc05a00/rectcrop3",
//   cast: {
//     pubHash: "0x984d5117df404f47bd5a72cb5852921aeddb4fad",
//     author: {
//       username: "heybilli",
//       display_name: "Billi",
//       pfp_url:
//         "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/c25730b6-e1db-45ff-e874-f72d5dc05a00/rectcrop3",
//     },
//     text: "GM mfers",
//     timestamp: "2024-12-11T21:54:52.000Z",
//     reactions: {
//       likes_count: 4,
//       recasts_count: 0,
//     },
//     replies: {
//       count: 7,
//     },
//   },
//   userCount: 1,
// };

const TokenDetail = ({ address }: { address: string }) => {
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const isConnectedRoom = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentText, setCurrentText] = useState<string>("");

  const [streamHost, setStreamHost] = useState<StreamHostProps>({
    status: "idle",
    streamType: null,
  });

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

  const isStreamer = useMemo(
    () => stream?.handle === farcasterUser?.handle,
    [stream?.handle, farcasterUser?.handle]
  );

  const isStreamedByAgent = useMemo(
    () => stream?.streamedByAgent || false,
    [stream?.streamedByAgent]
  );

  useEffect(() => {
    // Si ya hay una conexión o no hay dirección, salimos
    if (!address || socketRef.current) return;

    console.log("Starting socket connection for stream:", address);

    socketRef.current = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      secure: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected, joining stream:", address);
      socket.emit("joinStream", {
        streamId: address,
        handle: farcasterUser?.handle,
      });
      isConnectedRoom.current = true;
    });

    socket.on("userCount", ({ count, users: connectedUsers }) => {
      setUsers(connectedUsers);
      setUserCount(count);
    });

    socket.on("comment", (comment: Comment) => {
      setComments((prev) => [...prev, comment]);
    });

    socket.on("previousComments", (prevComments: Comment[]) => {
      setComments(prevComments);
    });

    if (stream?.streamedByAgent) {
      socket.on("new-audio", ({ audio, text }) => {
        setCurrentText(text);
        // ... resto del código de manejo de audio ...
      });
    }

    // Cleanup function
    return () => {
      if (socket) {
        console.log("Disconnecting socket for stream:", address);
        socket.emit("leaveStream", address);
        socket.off("connect");
        socket.off("userCount");
        socket.off("comment");
        socket.off("previousComments");
        socket.off("new-audio");
        socket.disconnect();
        socketRef.current = null;
        isConnectedRoom.current = false;
      }
    };
  }, [address]); // Solo depende de address

  const {
    data: castData,
    isLoading: isCastLoading,
    error: castError,
  } = useQuery({
    queryKey: ["cast", stream?.cast?.pubHash],
    queryFn: async () => {
      if (!stream?.cast?.pubHash) throw new Error("No pubHash available");
      const response = await fetch(`/api/cast?pubHash=${stream.cast.pubHash}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cast");
      }
      return response.json();
    },
    enabled: !!stream?.cast?.pubHash,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

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
                      src={stream?.pfpUrl || "/assets/stream/billi-pfp.png"}
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

              <div className="aspect-video bg-black rounded-lg overflow-hidden mt-auto">
                {isStreamedByAgent ? (
                  <AgentViewer
                    handle={stream.handle as string}
                    currentText={currentText}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                  />
                ) : isStreamer &&
                  streamHost.streamType !== "browser" &&
                  stream.status === "live" ? (
                  <StreamHost
                    streamHost={streamHost}
                    setStreamHost={setStreamHost}
                    stream={stream}
                  />
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
          isStreamedByAgent={isStreamedByAgent}
          cast={castData || stream?.cast}
        />
        {address && <TokenTrade tokenAddress={address as string} />}
      </div>
    </div>
  );
};

export default TokenDetail;
