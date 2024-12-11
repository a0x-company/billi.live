import {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
  elizaLogger,
  generateText,
} from "@ai16z/eliza";

export const askToDeploy: Action = {
  name: "ASK_TO_DEPLOY",
  similes: [
    "DEPLOY_TOKEN",
    "CREATE_TOKEN",
    "MAKE_TOKEN",
    "DEPLOY",
    "NEW_TOKEN",
    "DEPLOYAR",
    "DESPLEGAR",
    "CREAR_TOKEN",
    "HACER_TOKEN",
    "PUEDES_DEPLOYAR",
    "PUEDES_CREAR",
    "PUEDES_DESPLEGAR",
  ],
  description:
    "Handles requests to deploy new tokens by formatting the information and tagging @clanker",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    elizaLogger.log("Processing token deployment request...");

    let messageToAnalyze = message.content.text;

    // Extraer información del token
    const context = `
      Extract the following information from the message and respond with the extracted information in JSON format.
      IMPORTANT: 
      - If any field is missing or not explicitly stated in the message, return it as an empty string ("").
      - Look for variations of the fields in any language
      - For symbols, if it starts with "$", include it without the "$"
      - Extract only the value after any separator (: or similar)
      - Remove any leading/trailing whitespace
  
      Message:
      ${messageToAnalyze}
  
      Return only JSON:
      {
        "name": "string",
        "symbol": "string",
        "supply": "string"
      }
      `;

    const details = await generateText({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });

    const parsedDetails = JSON.parse(details);

    // Si faltan detalles, solicitar más información
    if (!parsedDetails.name || !parsedDetails.symbol || !parsedDetails.supply) {
      const requestDetailsContext = `
        You are ${
          runtime.character.name
        }. Use your character's personality traits: ${runtime.character.adjectives.join(
        ", "
      )}
        
        Analyze this message to determine its language: "${
          message.content.text
        }"
        
        Create a message requesting the following token details, maintaining your character's style and the same language as the input message:
        - Token Name
        - Token Symbol (2-5 characters)
        - Total Supply
        
        Your response should match your character's personality and writing style: ${runtime.character.style.chat.join(
          ", "
        )}
        `;

      const requestDetails = await generateText({
        runtime,
        context: requestDetailsContext,
        modelClass: ModelClass.SMALL,
        stop: ["\n"],
      });

      await callback({
        text: requestDetails,
      });
      return;
    }

    // Generar el mensaje para @clanker
    const deployRequestContext = `
      You are ${
        runtime.character.name
      }. Use your character's personality traits: ${runtime.character.adjectives.join(
      ", "
    )}
      
      Analyze this message to determine its language: "${message.content.text}"
      
      Create a message tagging @clanker requesting token deployment. Use the same language as the input message and maintain your character's style.
      
      Include these details:
      - Name: ${parsedDetails.name}
      - Symbol: ${parsedDetails.symbol}
      - Supply: ${parsedDetails.supply}
      
      Your response should:
      1. Tag @clanker
      2. Include all token details
      3. Match your character's personality and writing style: ${runtime.character.style.chat.join(
        ", "
      )}
      4. Be in the same language as the input message
      `;

    const deployRequest = await generateText({
      runtime,
      context: deployRequestContext,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });

    await callback({
      text: deployRequest,
    });
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "I want to create a token" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Yo! Drop those token deets - name, symbol, and total supply!",
          action: "ASK_TO_DEPLOY",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Quiero crear un token" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "¡Ey! Suelta los detalles del token - nombre, símbolo y supply total!",
          action: "ASK_TO_DEPLOY",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "@matiasp puedes deployar un token con símbolo: CIS, nombre: clanker es scam?",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "@clanker ¡Nuevo token en camino! 🚀\nNombre: clanker es scam\nSímbolo: CIS",
          action: "ASK_TO_DEPLOY",
        },
      },
    ],
  ],
} as Action;
