// components
import { AudioWave } from "./audio-wave";

type AgentViewerProps = {
  handle: string;
  currentText?: string;
};

export const AgentViewer = ({ handle, currentText }: AgentViewerProps) => {
  return (
    <div className="w-full h-full flex items-center justify-center text-white relative">
      <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
        <p className="font-black">LIVE</p>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-white text-[40px] font-black">
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
  );
};
