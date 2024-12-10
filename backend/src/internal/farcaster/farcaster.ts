import { AxiosInstance } from "axios";
import { Firestore } from "@google-cloud/firestore";
import { createNeynarClient } from "./client";
import { ActionType } from "@internal/livestreams";
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
}
