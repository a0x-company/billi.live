import React from "react";
import { Volume2, VolumeX, Maximize, Play, Pause } from "lucide-react";

interface MobileVideoControlsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onPlayPause: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: (mute: boolean) => void;
  onFullscreen: () => void;
}

const MobileVideoControls: React.FC<MobileVideoControlsProps> = ({
  isPlaying,
  volume,
  isMuted,
  onPlayPause,
  onVolumeChange,
  onMuteToggle,
  onFullscreen,
}) => {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
    if (newVolume > 0 && isMuted) {
      onMuteToggle(false);
    }
  };

  return (
    <div className="bg-black bg-opacity-50 text-white p-2 flex items-center justify-between">
      <div className="flex items-center">
        <button onClick={onPlayPause} className="mr-2">
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={() => onMuteToggle(!isMuted)} className="mr-2">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-24 accent-white"
        />
      </div>
      <button onClick={onFullscreen}>
        <Maximize size={24} />
      </button>
    </div>
  );
};

export default MobileVideoControls;
