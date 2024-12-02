import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";

const insultsProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return `Lista de insultos disponibles:
      hijo de puta,
      malaya qlia,
      gil qlio,
      sapo ql,
      conchetumadre,
      wn qliao,
      "charcha ql",
      "cara de raja",
      "longi qliao",
      "maraco qliao",
      "pelmazo culiao",
      "pajero ql",
      "boludo de mierda",
      "pelotudo",
      "forro",
      "conchudo",
      "salame",
      "mogólico",
      "trolo",
      "cabeza de termo",
      "mamaguevo",
      "pajuo",
      "coño de tu madre",
      "huevón",
      "mamahuevo",
      "jalabolas",
      "caraja",
      "chimbo",
      "malparido",
      "zángano"
    `;
  },
};

export default insultsProvider;
