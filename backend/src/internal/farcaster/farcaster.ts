import { AxiosInstance } from "axios";
import { Firestore } from "@google-cloud/firestore";
import { createNeynarClient } from "./client";
import { ActionType, CastInFarcaster } from "@internal/livestreams";
import { getActionStrategy } from "./actions";

interface FarcasterManager {}

export class FarcasterService {
  private client: AxiosInstance;

  constructor(db: Firestore) {
    this.client = createNeynarClient();
  }

  public async executeAction(
    actionType: ActionType,
    postId: string,
    additionalData?: any
  ): Promise<void | string> {
    try {
      const strategy = getActionStrategy(actionType, this.client);
      return await strategy.execute(postId, additionalData);
    } catch (error) {
      console.error(`Error executing action: ${actionType}`, error);
      throw error;
    }
  }

  public async getCastInFarcasterByPubHash(pubHash: string): Promise<CastInFarcaster> {
    try {
      const response = await this.client.get(`/cast?identifier=${pubHash}&type=hash`);
      return response.data;
    } catch (error) {
      console.error(`Error getting cast in farcaster by pub hash: ${pubHash}`, error);
      throw error;
    }
  }
}
