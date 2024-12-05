"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import { http } from "viem";
import { cookieStorage } from "wagmi";
import { createStorage } from "wagmi";

import { base } from "wagmi/chains";
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
}

export const config = getDefaultConfig({
  appName: "billi.live",
  projectId,
  chains: [base],
  ssr: true, // If your dApp uses server side rendering (SSR)
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [base.id]: http(),
  },
});
