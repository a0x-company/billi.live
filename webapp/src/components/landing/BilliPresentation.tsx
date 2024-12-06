"use client";

import { useEffect, useState } from "react";

export function BilliPresentation() {
  const [agentMessage, setAgentMessage] = useState("");
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgentMessage = async () => {
      try {
        const response = await fetch("/api/agent");
        const data = await response.json();
        setAgentMessage(data[0].text);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentMessage();
  }, []);

  useEffect(() => {
    if (!isLoading && agentMessage) {
      let index = 0;
      const intervalId = setInterval(() => {
        if (index <= agentMessage.length) {
          setDisplayedMessage(agentMessage.slice(0, index));
          index++;
        } else {
          clearInterval(intervalId);
        }
      }, 50);

      return () => clearInterval(intervalId);
    }
  }, [agentMessage, isLoading]);

  return (
    <div className="text-center space-y-6">
      <h1 className="text-5xl md:text-7xl font-bold text-white">
        GM, I&apos;m <span className="text-purple-500">Billi</span>
      </h1>

      <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto min-h-[4rem]">
        {isLoading ? (
          <span className="inline-block animate-pulse">
            <span className="inline-block w-4 h-4 bg-purple-500 rounded-full mr-2" />
            <span className="inline-block w-4 h-4 bg-purple-500 rounded-full mr-2 animate-bounce" />
            <span
              className="inline-block w-4 h-4 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </span>
        ) : (
          <span className="inline-block">{displayedMessage}</span>
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
          Comenzar a transmitir
        </button>
        <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium backdrop-blur-sm transition-colors">
          Explorar streams
        </button>
      </div>
    </div>
  );
}
