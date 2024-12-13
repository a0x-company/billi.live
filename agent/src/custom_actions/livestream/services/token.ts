import { ethers } from "ethers";
import { elizaLogger } from "@ai16z/eliza";

const ABI = [
  "function deployToken(string calldata name, string calldata symbol) external",
  "event TokenDeployed(address tokenAddress, string name, string symbol, address creator)",
];

export class TokenService {
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;

  constructor() {
    const jarbenPk = process.env.JARBEN_PRIVATE_KEY;
    if (!jarbenPk) {
      throw new Error(
        "JARBEN_PRIVATE_KEY no está definida en las variables de entorno"
      );
    }

    const rpcUrl = process.env.BASE_MAINNET_RPC_URL;
    if (!rpcUrl) {
      throw new Error(
        "BASE_MAINNET_RPC_URL no está definida en las variables de entorno"
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(jarbenPk, provider);

    this.wallet = new ethers.Wallet(jarbenPk, provider);
    this.contract = new ethers.Contract(
      "0x40585EFA7C02CC8EfA3B8b51009A58C694b88F89",
      ABI,
      this.wallet
    );
  }

  async deployToken(name: string, symbol: string): Promise<string> {
    try {
      elizaLogger.log(`Deploying token: ${name} (${symbol})`);

      const tx = await this.contract.deployToken(name, symbol);
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event && event.name === "TokenDeployed");

      if (!event) {
        throw new Error("Token deployment event not found");
      }

      const tokenAddress = event.args.tokenAddress;
      elizaLogger.log(`Token deployed at: ${tokenAddress}`);

      return tokenAddress;
    } catch (error) {
      elizaLogger.error("Token deployment failed:", error);
      throw error;
    }
  }
}
