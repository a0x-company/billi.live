import { Heart } from "lucide-react";
import Chart from "./chart";
import CreateToken from "./create-token";
import { TokenTrade } from "./token-trade";
import { ChatBox } from "../stream/chat-box";

const stream = {
  title: "Stream Title",
  viewerCount: 100,
  streamerName: "Streamer Name",
  description: "Stream Description",
};

const TokenDetail = () => {
  // const size = isMobile ? `h-[467px] w-[320px]` : `h-[480px] w-[895px]`;
  return (
    <div className="grid grid-cols-[320px_1fr] lg:grid-cols-[895px_1fr] gap-4 py-8">
      <div className="grid grid-cols-1 grid-rows-[655px_1fr] gap-4">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold mb-2">{stream.title}</h1>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-rose-500 font-medium flex items-center gap-1">
              <Heart className="w-4 h-4" /> {stream.viewerCount} viewers
            </span>
            <span className="text-gray-200">{stream.streamerName}</span>
          </div>
          <p className="text-gray-200">{stream.description}</p>

          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-white">
              Stream Preview
            </div>
          </div>
        </div>

        <Chart tokenAddress="0x283024E266B46C7B52bc4BE4B1Fd0F232DEb219F" />
      </div>

      <div className="grid grid-cols-1 grid-rows-[655px_1fr] gap-4">
        <ChatBox />
        <TokenTrade />
      </div>
    </div>
  );
};

export default TokenDetail;
