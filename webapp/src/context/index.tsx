"use client";

import { config } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { State, WagmiProvider } from "wagmi";
import { AuthKitProvider } from "@farcaster/auth-kit";

const queryClient = new QueryClient();

const authKitConfig = {
  relay: "https://relay.farcaster.xyz",
};

const ContextProvider = ({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: State | undefined;
}) => {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <AuthKitProvider config={authKitConfig}>{children}</AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default ContextProvider;
