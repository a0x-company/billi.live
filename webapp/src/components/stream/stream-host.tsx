import { useState } from "react";
import { StreamModal } from "./stream-modal";
import { Plus } from "lucide-react";
import { Livestream } from "@/firebase/action/livestream/getLivestream";
import BrowserBroadcast from "../livepeer/browser-broadcast";

export type StatusStream = "idle" | "streaming";
export type TypeStream = "obs" | "browser" | null;
export interface StreamHostProps {
  status: StatusStream;
  streamType: TypeStream;
}

const StreamHost = ({ stream }: { stream: Livestream }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [streamHost, setStreamHost] = useState<StreamHostProps>({
    status: "idle",
    streamType: null,
  });
  const handleSelectStreamType = (
    type: TypeStream | null,
    status?: StatusStream
  ) => {
    setStreamHost((prev) => ({
      ...prev,
      status: status ?? prev.status,
      streamType: type,
    }));
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
          Livestream is waiting for start
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
