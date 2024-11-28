"use client";

import { config } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { State, WagmiProvider } from "wagmi";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { FarcasterUserProvider } from "./FarcasterUserContext";

const queryClient = new QueryClient();

const authKitConfig = {
  relay: "https://relay.farcaster.xyz",
};

const ContextProvider = ({
  children,
  initialState,
  session,
}: {
  children: ReactNode;
  initialState: State | undefined;
  session: Session | null;
}) => {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <AuthKitProvider config={authKitConfig}>
          <SessionProvider session={session}>
            <FarcasterUserProvider>{children}</FarcasterUserProvider>
          </SessionProvider>
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default ContextProvider;
