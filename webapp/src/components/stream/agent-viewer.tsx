type AgentViewerProps = {
  handle: string;
};

export const AgentViewer = ({ handle }: AgentViewerProps) => {
  return (
    <div className="w-full h-full flex items-center justify-center text-white relative">
      <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
        <p className="font-black">LIVE</p>
      </div>

      <p className="text-white text-[40px] font-black">
        <span className="text-rose-500">@{handle}</span> is streaming
      </p>
    </div>
  );
};
