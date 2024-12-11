import axios from "axios";

export class AgentService {
  async talkToAgent(message: string): Promise<string> {
    const agentId = "8cc63a38-6ebd-0139-82ee-75727e511406";

    try {
      // const response = await axios.post(`http://localhost:3000/${agentId}/message`, {
      const response = await axios.post(
        `https://eb73-2800-300-6272-f6b0-58d2-d20c-c1c5-26b8.ngrok-free.app/${agentId}/message`,
        {
          text: message,
        }
      );

      const responseText = response.data[0].text;

      return responseText;
    } catch (error) {
      console.error("Error talking with agent", error);
      throw error;
    }
  }
}
