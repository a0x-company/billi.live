import { IAgentRuntime, Memory, Provider } from "@ai16z/eliza";

const timeProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory) => {
    const currentDate = new Date();
    const currentDateString = currentDate.toLocaleDateString("en-US");
    const currentTime = currentDate.toLocaleTimeString("en-US");
    return `The current time is: ${currentTime}, ${currentDateString}`;
  },
};

export default timeProvider;
