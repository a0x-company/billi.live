"use client";

import { useEffect, useState } from "react";

export function BilliPresentation() {
  const [agentMessage, setAgentMessage] = useState("");

  useEffect(() => {
    const fetchAgentMessage = async () => {
      const response = await fetch("/api/agent");
      const data = await response.json();

      console.log("data", data);
      setAgentMessage(data[0].text);
    };

    fetchAgentMessage();
  }, []);

  return (
    <div className="text-center space-y-6">
      <h1 className="text-5xl md:text-7xl font-bold text-white">
        GM, I&apos;m <span className="text-purple-500">Billi</span>
      </h1>
      <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
        {agentMessage}
      </p>

      {/* Botones de acción */}
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
