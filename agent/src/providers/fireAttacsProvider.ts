import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";

const fireAttacsProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return `Lista de ataques de fuego disponibles:
      Fire Punch,
      Fire Spin,
      Fire Fang,
      Fire Punch,
      Flamethrower,
      Lanzallamas
    `;
  },
};

export default fireAttacsProvider;
