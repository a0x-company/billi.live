// firestore
import { Firestore } from "@google-cloud/firestore";

// types
import { Agent } from "./types";

export interface AgentStorage {
  getAgentByHandle(handle: string): Promise<Agent | null>;
}

export class AgentStorage implements AgentStorage {
  constructor(private firestore: Firestore) {}

  private readonly AGENTS_COLLECTION = "agents";

  public async getAgentByHandle(handle: string): Promise<Agent | null> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.AGENTS_COLLECTION)
        .where("handle", "==", handle)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();

        return {
          handle: data.handle,
          voiceId: data.voiceId,
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting agent", error);
      throw error;
    }
  }
}
