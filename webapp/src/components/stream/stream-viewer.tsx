// react
import { useState } from "react";
// types
import { Livestream } from "@/types";
// components
import PlayerForHls from "../livepeer/player-hls";

const StreamViewer = ({
  stream,
  isStreamer,
  setShowStreamHost,
}: {
  stream: Livestream;
  isStreamer: boolean;
  setShowStreamHost: (showStreamHost: boolean) => void;
}) => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  return (
    <PlayerForHls
      src={stream.livepeerInfo.playbackUrl}
      isStreaming={isStreaming}
      setIsStreaming={setIsStreaming}
      setIsLoadingStream={setIsLoadingStream}
      isStreamer={isStreamer}
      setShowStreamHost={setShowStreamHost}
    />
  );
};

export default StreamViewer;
