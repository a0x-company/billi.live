"use client";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { memo } from "react";

interface ChartProps {
  tokenAddress: string;
}

const Chart: React.FC<ChartProps> = ({ tokenAddress }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const size = isMobile ? `h-[467px] w-[320px]` : `h-[580px] w-[895px]`;
  return (
    <iframe
      className={size}
      id="geckoterminal-embed"
      title="GeckoTerminal Embed"
      src={`https://www.geckoterminal.com/es/base/pools/${tokenAddress}?embed=1&info=0&swaps=0`}
      allow="clipboard-write"
      allowFullScreen
    ></iframe>
  );
};

export default memo(Chart);
