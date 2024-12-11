export * from "./actions/swap.ts";
export * from "./actions/transfer.ts";
export * from "./types/index.ts";
export * from "./providers/wallet.ts";

import type { Plugin } from "@ai16z/eliza";
import { swapAction } from "./actions/swap.ts";
import { transferAction } from "./actions/transfer.ts";
import { evmWalletProvider } from "./providers/wallet.ts";

export const evmPlugin: Plugin = {
  name: "evm",
  description: "EVM blockchain integration plugin",
  providers: [evmWalletProvider],
  evaluators: [],
  services: [],
  actions: [transferAction, swapAction],
};

export default evmPlugin;
