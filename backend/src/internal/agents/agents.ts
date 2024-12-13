import { AGENT_API_URL } from "@internal/config";
import axios from "axios";

export class AgentService {
  async talkToAgent(message: string): Promise<string> {
    const agentId = "8cc63a38-6ebd-0139-82ee-75727e511406";

    try {
      const response = await axios.post(`${AGENT_API_URL}/${agentId}/message`, {
        text: message,
      });

      const responseText = response.data[0].text;

      return responseText;
    } catch (error) {
      console.error("Error talking with agent", error);
      throw error;
    }
  }
}
