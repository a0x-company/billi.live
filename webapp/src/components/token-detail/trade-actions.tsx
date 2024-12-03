import { Tag, Zap } from "lucide-react";
import React from "react";

const PRESET_AMOUNTS = [0.25, 0.5, 1, 2, 5, 10];

interface TradeActionsProps {
  onBuy: (amount: number) => void;
  onSell: (amount: number) => void;
  onAmountSelect: (amount: number) => void;
  selectedAmount: number;
}

export const TradeActions: React.FC<TradeActionsProps> = ({
  onBuy,
  onSell,
  onAmountSelect,
  selectedAmount,
}) => {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {PRESET_AMOUNTS.map((amount) => (
          <button
            key={amount}
            onClick={() => onAmountSelect(amount)}
            className={`py-2 rounded-lg transition-colors ${
              selectedAmount === amount
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {amount}
          </button>
        ))}
      </div>

      <div className="text-gray-400 text-sm text-center">
        Amount to buy in ETH
      </div>

      <input
        type="number"
        className="w-full bg-gray-800 text-white p-2 rounded-lg"
        placeholder="0.00"
      />

      <div className="flex gap-2">
        <button
          onClick={() => onBuy(selectedAmount)}
          className="flex items-center justify-center flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors"
        >
          <Zap className="w-4 h-4 mr-2" />
          Pump
        </button>
        <button
          onClick={() => onSell(selectedAmount)}
          className="flex items-center justify-center flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg transition-colors"
        >
          <Tag className="w-4 h-4 mr-2" />
          Dump
        </button>
      </div>
    </div>
  );
};
