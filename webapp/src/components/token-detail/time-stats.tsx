"use client";
import React from "react";
import { cn } from "@/utils/tailwindcss";

interface TimeStatsProps {
  timeStats: {
    [key: string]: number;
  };
}

export const TimeStats: React.FC<TimeStatsProps> = ({ timeStats }) => {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-2 text-sm">
      {Object.entries(timeStats).map(([time, value]) => (
        <div key={time}>
          <div className="text-gray-500 text-xs mb-1">{time}</div>
          <div
            className={cn(
              "font-medium",
              value > 0
                ? "text-green-500"
                : value < 0
                ? "text-red-500"
                : "text-gray-400"
            )}
          >
            {value > 0 ? "+" : ""}
            {value.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
};
