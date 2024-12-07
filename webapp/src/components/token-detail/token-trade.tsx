"use client";
import React, { useRef } from "react";

const widgetURL =
  "https://app.uniswap.org/#/swap?exactField=input&outputCurrency=";

export const TokenTrade: React.FC<{
  tokenAddress: string;
}> = ({ tokenAddress }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const url = `${widgetURL}${tokenAddress}&chain=base&theme=dark`;
  const handleLoad = () => {
    const iframeDocument = iframeRef.current?.contentDocument;
    if (iframeDocument) {
      iframeDocument.body.style.backgroundColor = "transparent";
      iframeDocument.body.style.scrollbarWidth = "none";
    }
  };
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full"
        onLoad={handleLoad}
      />
    </div>
  );
};
