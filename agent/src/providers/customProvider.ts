import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";

import Moralis from "moralis";

let isMoralisInitialized = false;

const initializeMoralis = async () => {
  if (!isMoralisInitialized) {
    try {
      await Moralis.start({
        apiKey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjNiYzliOTdhLWU0YWEtNDgyNy05YTc1LTNjYTE5MDU4M2MxNiIsIm9yZ0lkIjoiMTg4NTUyIiwidXNlcklkIjoiMTg4MjI0IiwidHlwZUlkIjoiNzRhNDlkMmQtNWUxZS00NjhlLTg4YTMtNzdmM2Y5MGRhNDQ4IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MTQ1MzI3NTIsImV4cCI6NDg3MDI5Mjc1Mn0.4hCBhIm80vZFWECx9QzjHU1bv44z4ULL9I40zvEmbAo",
      });
      isMoralisInitialized = true;
    } catch (error) {
      console.error("Error initializing Moralis:", error);
      throw error;
    }
  }
};

const customProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const jarbenAddress = "0xD389Ee0Ef592a3a83Fb8D8Ce029c367106Be4098";

    try {
      await initializeMoralis();

      // console.log("Getting balance of Jarben in address:", jarbenAddress);

      const balance = await getAddressBalance();

      return `Jarben address: ${jarbenAddress} \n Balance: ${balance}`;
    } catch (error) {
      console.error("Error in customProvider:", error);
      return `Error getting balance for address: ${jarbenAddress}`;
    }
  },
};

function formatBalances(data: any) {
  if (!data.result || !Array.isArray(data.result)) {
    return "No balance data available";
  }

  return data.result
    .map((token) => {
      const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);

      return {
        symbol: token.symbol,
        balance: balance.toFixed(4),
        usdValue: token.usd_value.toFixed(2),
      };
    })
    .filter((token) => parseFloat(token.balance) > 0)
    .map(
      (token) => `${token.symbol}: ${token.balance} (USD: $${token.usdValue})`
    )
    .join("\n");
}

async function getAddressBalance() {
  try {
    const response = await Moralis.EvmApi.wallets.getWalletTokenBalancesPrice({
      chain: "0x2105",
      address: "0xD389Ee0Ef592a3a83Fb8D8Ce029c367106Be4098",
    });

    const balances = response.toJSON();
    const formattedBalances = formatBalances(balances);
    return formattedBalances;
  } catch (e) {
    console.error("Error getting balance:", e);
    throw e;
  }
}

export default customProvider;
