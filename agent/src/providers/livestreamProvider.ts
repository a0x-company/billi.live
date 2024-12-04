import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";

const shouldStartLivestreamTemplate = `
Te dejo el link para que puedas empezar a grabar tu stream. 
{{livestreamHostUrl}}

Y este es el link para que puedas ver el stream en vivo.
{{livestreamViewerUrl}}
`;

const livestreamProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const shouldStartLivestream = await runtime.prompt(
      shouldStartLivestreamTemplate
    );
  },
};

export default livestreamProvider;
