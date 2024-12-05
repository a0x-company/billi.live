"use client";

import { LivestreamError } from "@/app/api/livestream/route";
import { FarcasterUserContext } from "@/context/FarcasterUserContext";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useContext } from "react";
import { ChatBox } from "../stream/chat-box";
import Chart from "./chart";
import { TokenTrade } from "./token-trade";
import { LoadingSpinner } from "../spinner";
import { Livestream } from "@/firebase/action/livestream/getLivestream";
import StreamHost from "../stream/stream-host";
import StreamViewer from "../stream/stream-viewer";
import Link from "next/link";

const stream = {
  title: "Stream Title",
  viewerCount: 100,
  streamerName: "Streamer Name",
  description: "Stream Description",
};

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
  const { farcasterUser } = useContext(FarcasterUserContext);

  const {
    data: stream,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["stream", address],
    queryFn: () => getLiveStremingByTokenAddress(address),
    enabled: !!address,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const isStreamer =
    stream?.createdByFID === farcasterUser?.fid &&
    stream?.createdByUsername === farcasterUser?.name;

  return (
    <div className="grid grid-cols-[320px_1fr] lg:grid-cols-[895px_1fr] gap-4 py-8">
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
                  <Heart className="w-4 h-4" /> 0 viewers
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
                  <Heart className="w-4 h-4" /> 0 viewers
                </span>
                <Link
                  href={`https://warpcast.com/${stream.createdByUsername}`}
                  target="_blank"
                  className="text-gray-200"
                >
                  {stream.createdByUsername}
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

        <div className="flex row-span-2 flex-col gap-4">
          <Chart tokenAddress={address} />
        </div>
      </div>

      <div className="grid grid-cols-1 grid-rows-[655px_1fr] gap-4">
        <ChatBox />
        <TokenTrade />
      </div>
    </div>
  );
};

export default TokenDetail;
