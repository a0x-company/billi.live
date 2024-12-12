// components
import { useState, useEffect, useRef } from "react";
import { AudioWave } from "./audio-wave";

// icons
import { Volume2Icon, VolumeOff } from "lucide-react";

type AgentViewerProps = {
  handle: string;
  currentText?: string;
  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
};

export const AgentViewer = ({
  handle,
  currentText,
  isMuted,
  setIsMuted,
}: AgentViewerProps) => {
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = 0.1;
      backgroundMusicRef.current.loop = true;

      if (!isMuted) {
        backgroundMusicRef.current.play().catch(console.error);
      } else {
        backgroundMusicRef.current.pause();
      }
    }
  }, [isMuted]);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="w-full h-full flex items-center justify-center text-white relative">
      {/* Video de fondo */}
      <div className="absolute inset-0 z-0">
        <video
          src="/assets/landing/static.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-black/50 z-10" />

      <div className="relative z-20 w-full h-full">
        <audio
          ref={backgroundMusicRef}
          src="/assets/music/lofi.mp3"
          className="hidden"
        />

        <button
          onClick={handleMuteToggle}
          className="absolute top-3 left-3 bg-gray-800/50 p-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          {isMuted ? (
            <VolumeOff className="w-5 h-5" />
          ) : (
            <Volume2Icon className="w-5 h-5" />
          )}
        </button>

        <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
          <p className="font-black select-none">LIVE</p>
        </div>

        <div className="flex flex-col items-center h-full justify-center">
          <p className="text-white text-[40px] font-black select-none">
            <span className="text-rose-500">@{handle}</span> is streaming
          </p>

          <AudioWave isPlaying={!!currentText} />
        </div>

        {currentText && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-6 py-3 rounded-lg shadow-lg whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%]">
            {currentText}
          </div>
        )}
      </div>
    </div>
  );
};
