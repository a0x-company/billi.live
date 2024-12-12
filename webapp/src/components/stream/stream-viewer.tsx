// react
import { useState } from "react";
// types
import { Livestream } from "@/types";
// components
import PlayerForHls from "../livepeer/player-hls";

const StreamViewer = ({ stream }: { stream: Livestream }) => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  /* CHANGE SCREEN THEN USER IS STREAMING (status:live) BY OBS */
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
