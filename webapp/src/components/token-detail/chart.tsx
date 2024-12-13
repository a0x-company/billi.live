"use client";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { memo } from "react";

interface ChartProps {
  tokenAddress: string;
}
const url =
  "https://dexscreener.com/base/tokenAddress?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15";

const parseTokenAddress = (tokenAddress: string) => {
  return url.replace("tokenAddress", tokenAddress);
};

const Chart: React.FC<ChartProps> = ({ tokenAddress }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const size = isMobile ? `h-[467px] w-[360px]` : `h-[580px] w-[895px]`;
  return (
    <iframe
      className={size}
      id="dexscreener-embed"
      title="Dexscreener Embed"
      src={parseTokenAddress(tokenAddress)}
      allow="clipboard-write"
      allowFullScreen
    ></iframe>
  );
};

export default memo(Chart);
