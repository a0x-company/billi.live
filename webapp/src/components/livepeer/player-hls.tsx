import Hls from "hls.js";
import React, { useEffect, useRef, useState } from "react";
import MobileVideoControls from "./mobile-video-controls";
import { ArrowLeft } from "lucide-react";

interface PlayerForHlsProps {
  src: string;
  isStreaming: boolean;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsLoadingStream: (isLoadingStream: boolean) => void;
  isStreamer: boolean;
  setShowStreamHost: (showStreamHost: boolean) => void;
}

const PlayerForHls: React.FC<PlayerForHlsProps> = ({
  src,
  isStreaming,
  setIsStreaming,
  setIsLoadingStream,
  isStreamer,
  setShowStreamHost,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true); // Start muted to allow autoplay

  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;

    const playVideo = () => {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsStreaming(true);
          setIsLoadingStream(false);
        })
        .catch((error) => {
          console.error("Autoplay failed:", error);
          // If autoplay fails, we keep the video muted and try again
          video.muted = true;
          video.play().catch(console.error);
        });
    };

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        playVideo();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", event, data);
        if (data.fatal) {
          setIsStreaming(false);
          setIsLoadingStream(false);
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari and iOS devices
      video.src = src;
      video.addEventListener("loadedmetadata", playVideo);
      video.addEventListener("error", (e) => {
        console.error("Video error:", e);
        setIsStreaming(false);
        setIsLoadingStream(false);
      });

      return () => {
        video.removeEventListener("loadedmetadata", playVideo);
      };
    } else {
      console.error("HLS is not supported on this browser.");
      setIsStreaming(false);
      setIsLoadingStream(false);
    }
  }, [src, setIsStreaming, setIsLoadingStream]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleMuteToggle = (mute: boolean) => {
    setIsMuted(mute);
    if (videoRef.current) {
      videoRef.current.muted = mute;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {isStreamer && (
        <button
          onClick={() => setShowStreamHost(false)}
          className="absolute top-4 left-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Return to Config
        </button>
      )}
      {isStreaming ? (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            autoPlay
            muted={isMuted}
          />
          <div className="absolute top-0 left-0 right-0">
            <MobileVideoControls
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              onPlayPause={handlePlayPause}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onFullscreen={handleFullscreen}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-fit items-center justify-center h-full rounded-[100px]">
          <p className="text-white font-sf-pro-rounded text-[20px] mb-8">
            No stream available... yet
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerForHls;
