import { Livestream } from "@/firebase/action/livestream/getLivestream";
import PlayerForHls from "../livepeer/player-hls";
import { useState } from "react";

const StreamViewer = ({ stream }: { stream: Livestream }) => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  return (
    <PlayerForHls
      src={stream.livepeerInfo.playbackUrl}
      isStreaming={isStreaming}
      setIsStreaming={setIsStreaming}
      setIsLoadingStream={setIsLoadingStream}
    />
  );
};

export default StreamViewer;
