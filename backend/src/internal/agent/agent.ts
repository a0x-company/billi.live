import { Firestore } from "@google-cloud/firestore";
import { AxiosInstance } from "axios";
import { createAgentClient } from "./client";
import { AGENT_ID } from "@internal/config";

export class AgentService {
  private client: AxiosInstance;

  constructor(private firestore: Firestore) {
    this.client = createAgentClient();
  }

  async interactWithAgent(comment: string) {
    const response = await this.client.post(`/${AGENT_ID}/message`, {
      text: comment,
    });
    return response.data;
  }
}
