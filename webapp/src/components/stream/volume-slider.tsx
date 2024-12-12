import { Volume2Icon, VolumeOff } from "lucide-react";
import { useEffect, useState } from "react";

interface VolumeSliderProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
}

export const VolumeSlider = ({
  audioRef,
  isMuted,
  setIsMuted,
}: VolumeSliderProps) => {
  const [volume, setVolume] = useState(10); // 0-100
  const [isHovered, setIsHovered] = useState(false);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div
      className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleMuteToggle}
        className="hover:bg-gray-700/50 p-1 rounded-full transition-colors"
      >
        {isMuted ? (
          <VolumeOff className="w-5 h-5" />
        ) : (
          <Volume2Icon className="w-5 h-5" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isHovered ? "w-24" : "w-0"
        }`}
      >
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            hover:[&::-webkit-slider-thumb]:bg-purple-500
            [&::-webkit-slider-thumb]:transition-colors"
        />
      </div>
    </div>
  );
};
