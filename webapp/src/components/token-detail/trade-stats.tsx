"use client";
import React from "react";

interface TradeStatsProps {
  transactions: number;
  buys: number;
  sells: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  makers: number;
  buyers: number;
  sellers: number;
}

export const TradeStats: React.FC<TradeStatsProps> = ({
  transactions,
  buys,
  sells,
  volume,
  buyVolume,
  sellVolume,
  makers,
  buyers,
  sellers,
}) => {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
      <div className="space-y-4">
        <div>
          <div className="text-gray-500 mb-1">TXNS</div>
          <div className="text-white">{transactions}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">VOLUME</div>
          <div className="text-white">${volume.toFixed(2)}</div>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-gray-500 mb-1">BUYS</div>
          <div className="text-green-500">{buys}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">BUY VOL</div>
          <div className="text-green-500">${buyVolume.toFixed(2)}</div>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-gray-500 mb-1">SELLS</div>
          <div className="text-red-500">{sells}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">SELL VOL</div>
          <div className="text-red-500">${sellVolume.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};
