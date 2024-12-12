"use client";
// react
import { useState } from "react";
// components
import { StreamModal } from "./stream-modal";
import BrowserBroadcast from "../livepeer/browser-broadcast";
// icons
import { Plus } from "lucide-react";
// types
import { Livestream } from "@/types";

export type StatusStream = "idle" | "streaming";
export type TypeStream = "obs" | "browser" | null;
export interface StreamHostProps {
  status: StatusStream;
  streamType: TypeStream;
}

const StreamHost = ({
  streamHost,
  setStreamHost,
  stream,
}: {
  streamHost: StreamHostProps;
  setStreamHost: (streamHost: StreamHostProps) => void;
  stream: Livestream;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectStreamType = (
    type: TypeStream | null,
    status?: StatusStream
  ) => {
    setStreamHost({
      ...streamHost,
      status: status ?? streamHost.status,
      streamType: type,
    });
  };
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      {streamHost.status !== "streaming" && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Start Stream
        </button>
      )}
      {streamHost.status === "idle" && (
        <p className="w-full h-full flex items-center justify-center text-white">
          Livestream is waiting to begin
        </p>
      )}
      {streamHost.status === "streaming" &&
        streamHost.streamType === "browser" && (
          <BrowserBroadcast streamKey={stream.livepeerInfo.streamKey} />
        )}
      <StreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stream={stream}
        onSelectStreamType={handleSelectStreamType}
        streamHost={streamHost}
      />
    </div>
  );
};

export default StreamHost;
