// firestore
import { Firestore } from "@google-cloud/firestore";

// axios
import { AxiosInstance } from "axios";

// client
import { createAgentClient } from "./client";

// types
import { Agent } from "./types";

// config
import { AGENT_ID } from "@internal/config";

// storage
import { AgentStorage } from "./storage";

export class AgentService {
  private client: AxiosInstance;

  private storage: AgentStorage;

  constructor(private firestore: Firestore) {
    this.client = createAgentClient();
    this.storage = new AgentStorage(firestore);
  }

  async interactWithAgent(comment: string) {
    const response = await this.client.post(`/${AGENT_ID}/message`, {
      text: comment,
    });
    return response.data;
  }

  async getAgentByHandle(handle: string) {
    const agent = await this.storage.getAgentByHandle(handle);
    return agent;
  }
}
