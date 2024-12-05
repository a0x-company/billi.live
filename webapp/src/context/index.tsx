"use client";

// next
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

// react
import { type ReactNode } from "react";

// react query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// config
import { config } from "@/config";

// wagmi
import { WagmiProvider } from "wagmi";

// farcaster
import { AuthKitProvider } from "@farcaster/auth-kit";

// context
import { FarcasterUserProvider } from "./FarcasterUserContext";

// rainbowkit
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";

const queryClient = new QueryClient();

const authKitConfig = {
  relay: "https://relay.farcaster.xyz",
};

const ContextProvider = ({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AuthKitProvider config={authKitConfig}>
            <SessionProvider session={session}>
              <FarcasterUserProvider>{children}</FarcasterUserProvider>
            </SessionProvider>
          </AuthKitProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default ContextProvider;
