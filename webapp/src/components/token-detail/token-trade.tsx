"use client";
import React, { useState } from "react";
import { TokenStats } from "./token-stats";
import { TimeStats } from "./time-stats";
import { TradeStats } from "./trade-stats";
import { TradeActions } from "./trade-actions";

const mockTimeStats = {
  "5M": 0.0,
  "1H": 973.35,
  "6H": 973.35,
  "24H": 973.35,
};

const mockTradeStats = {
  transactions: 1,
  buys: 1,
  sells: 0,
  volume: 0.9,
  buyVolume: 0.9,
  sellVolume: 0,
  makers: 1,
  buyers: 1,
  sellers: 0,
};

export const TokenTrade: React.FC = () => {
  const [selectedAmount, setSelectedAmount] = useState(0.25);

  const handleBuy = (amount: number) => {
    console.log("Buying:", amount);
    // Implement buy logic
  };

  const handleSell = (amount: number) => {
    console.log("Selling:", amount);
    // Implement sell logic
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
      <TokenStats
        price={0.2178}
        priceWeth={0.16602}
        supply="1T"
        liquidity={119.82}
        fdv={217.89}
        marketCap={218}
      />

      <div className="border-t border-gray-800">
        <TimeStats timeStats={mockTimeStats} />
      </div>

      <div className="border-t border-gray-800">
        <TradeStats {...mockTradeStats} />
      </div>

      <div className="border-t border-gray-800 p-4">
        <TradeActions
          onBuy={handleBuy}
          onSell={handleSell}
          onAmountSelect={setSelectedAmount}
          selectedAmount={selectedAmount}
        />
      </div>
    </div>
  );
};
