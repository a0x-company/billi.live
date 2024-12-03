"use client";
import React from "react";

interface TokenStatsProps {
  price: number;
  priceWeth: number;
  supply: string;
  liquidity: number;
  fdv: number;
  marketCap: number;
}

export const TokenStats: React.FC<TokenStatsProps> = ({
  price,
  priceWeth,
  supply,
  liquidity,
  fdv,
  marketCap,
}) => {
  return (
    <div className="grid grid-cols-3 gap-4 p-4 text-sm">
      <div>
        <div className="text-gray-500 mb-1">PRICE USD</div>
        <div className="text-white font-medium">${price.toFixed(4)}</div>
      </div>
      <div>
        <div className="text-gray-500 mb-1">PRICE WETH</div>
        <div className="text-white font-medium">{priceWeth.toFixed(6)}</div>
      </div>
      <div>
        <div className="text-gray-500 mb-1">SUPPLY</div>
        <div className="text-white font-medium">{supply}</div>
      </div>
      <div>
        <div className="text-gray-500 mb-1">LIQUIDITY</div>
        <div className="text-white font-medium">${liquidity.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-gray-500 mb-1">FDV</div>
        <div className="text-white font-medium">${fdv.toFixed(2)}K</div>
      </div>
      <div>
        <div className="text-gray-500 mb-1">MKT CAP</div>
        <div className="text-white font-medium">${marketCap}K</div>
      </div>
    </div>
  );
};
