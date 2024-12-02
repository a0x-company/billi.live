import { Action, IAgentRuntime, Memory, Content } from "@ai16z/eliza";

import { ethers } from "ethers";

const transferTokensAction: Action = {
  name: "TRANSFER_TOKENS",
  similes: ["TRANSFERIR_TOKENS", "MOVE_TOKENS", "MOVER_TOKENS"],
  description: "Usada cuando el usuario le pide transferir tokens a su wallet",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Validación básica del mensaje
    const text = message.content.text.toLowerCase();

    // Verificar que el mensaje contiene una cantidad y una dirección de wallet
    const hasAmount = /\d+(\.\d+)?/.test(text);
    const hasWallet = /0x[a-fA-F0-9]{40}/.test(text);

    if (!hasAmount || !hasWallet) {
      return false;
    }

    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory
  ): Promise<Content> => {
    console.log("Handling transfer tokens action");

    // Extraer la cantidad de USDC del mensaje
    const amountMatch = message.content.text.match(
      /(\d+(?:\.\d+)?)\s*(?:usdc|tokens?)?/i
    );
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    // Extraer la dirección de wallet del mensaje
    const walletMatch = message.content.text.match(/0x[a-fA-F0-9]{40}/);
    const walletAddress = walletMatch ? walletMatch[0] : "";

    console.log("Amount:", amount);
    console.log("Wallet address:", walletAddress);

    // Convertir la cantidad a la unidad más pequeña de USDC (6 decimales)
    const usdcAmount = Math.floor(amount * 1_000_000).toString();

    const jarbenPk =
      "2fdb44c67a49b75b43671c2d8cc1b31122ebcd9ca67eff3067ce7ed42b0c31cc";
    const provider = new ethers.JsonRpcProvider(
      "https://patient-skilled-lambo.base-mainnet.quiknode.pro/f635b65fa342d6fdf7a1e2bbe83f648eca9c7258/"
    );

    const wallet = new ethers.Wallet(jarbenPk, provider);

    const usdcContract = new ethers.Contract(
      "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      ["function transfer(address to, uint256 amount) public returns (bool)"],
      wallet
    );

    try {
      const tx = await usdcContract.transfer(walletAddress, usdcAmount);
      await tx.wait();

      return {
        text: `Transferencia exitosa ✅\nEnviado: ${amount} USDC\nA: ${walletAddress}\nTx Hash: ${tx.hash}`,
        action: "TRANSFER_TOKENS",
      };
    } catch (error) {
      console.error("Transfer failed:", error);
      return {
        text: `Error en la transferencia: ${error.message}`,
        action: "TRANSFER_TOKENS",
      };
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Quiero que me transfieras 1.5 USDC a mi wallet 0x1234567890123456789012345678901234567890",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Claro, procesaré la transferencia de 1.5 USDC",
          action: "TRANSFER_TOKENS",
        },
      },
    ],
  ],
};

export default transferTokensAction;
