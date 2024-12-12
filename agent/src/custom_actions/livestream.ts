import {
  Action,
  elizaLogger,
  generateText,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
} from "@ai16z/eliza";

interface MessageMetadata {
  castHash?: string;
  author?: {
    username: string;
    pfp_url: string;
  };
  embeds?: {
    url: string;
  }[];
  conversationHistory?: {
    author: string;
    text: string;
    timestamp: string;
    id: string;
    pfp_url: string;
  }[];
}

interface StreamDetails {
  title: string;
  description: string;
  tokenSymbol: string;
  tokenName: string;
  handle?: string;
}

const livestreamUrl = "https://billi.live";
const API_URL = process.env.API_URL;

const generateContextAwareText = async (
  runtime: IAgentRuntime,
  message: Memory,
  purpose: "request_details" | "token_creation" | "success_message",
  details?: {
    missingFields?: string[];
    tokenName?: string;
    tokenSymbol?: string;
    title?: string;
    livestreamLink?: string;
  }
) => {
  const conversationHistory =
    (message.content.metadata as MessageMetadata)?.conversationHistory || [];
  const previousMessages = conversationHistory
    .slice(-10)
    .map((msg) => `${msg.author}: ${msg.text}`)
    .join("\n");

  const contextTemplate = {
    request_details: `
      Previous conversation:
      ${previousMessages}
      
      TASK: Request these missing details naturally: ${details?.missingFields?.join(
        ", "
      )}
      
      CRITICAL:
      - Continue the conversation flow naturally
      - Don't break character or tone
      - No emojis or excessive punctuation
      - Keep it casual and confident
      - Maximum 320 characters
      
      Example flows:
      "drop those stream details and let's show them real competition"
      "give me the title and description of your legacy"
    `,
    token_creation: `
      Previous conversation:
      ${previousMessages}
      
      TASK: Request token creation from @clanker
      Token details:
      - Name: ${details?.tokenName}
      - Symbol: ${details?.tokenSymbol}
      
      CRITICAL:
      - Continue the conversation flow naturally
      - Keep it casual and confident
      - Include @clanker mention
      - Maximum 320 characters
    `,
    success_message: `
      Previous conversation:
      ${previousMessages}
      
      TASK: Announce successful livestream creation
      Details:
      - Link: ${details?.livestreamLink}
      - Title: ${details?.title}
      - Token: ${details?.tokenSymbol}
      
      CRITICAL:
      - Continue the conversation flow naturally
      - Keep it casual and confident
      - Include the livestream link
      - Maximum 320 characters
    `,
  };

  return await generateText({
    runtime,
    context: contextTemplate[purpose],
    modelClass: ModelClass.SMALL,
    stop: ["\n"],
  });
};

const createLivestream = async ({
  handle,
  title,
  description,
  pfpUrl,
  pubHash,
  tokenAddress,
}: {
  handle: string;
  title: string;
  description: string;
  pfpUrl: string;
  pubHash: string;
  tokenAddress: string;
}) => {
  const body = { handle, title, description, pfpUrl, pubHash, tokenAddress };
  try {
    const response = await fetch(`${API_URL}/livestreams/create-livestream`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
    elizaLogger.log("Response:", response);
    return response.json();
  } catch (error) {
    elizaLogger.error("Error creating livestream:", error);
    return null;
  }
};

const extractStreamDetails = async (
  runtime: IAgentRuntime,
  message: Memory
): Promise<StreamDetails> => {
  const metadata = message.content.metadata as MessageMetadata;
  const conversationHistory = metadata?.conversationHistory || [];
  let messageToAnalyze = message.content.text;

  if (conversationHistory.length > 0) {
    messageToAnalyze = `
      Previous messages:
      ${conversationHistory
        .map((msg) => `${msg.author}: ${msg.text}`)
        .join("\n")}
      Current message:
      ${message.content.text}
    `;
  }

  const extractionContext = `
    Extract the following information from the conversation and respond with the extracted information in JSON format.
    Look through all messages in the conversation for these details.
    
    IMPORTANT: 
    - Return ONLY the JSON object, no markdown formatting, no backticks
    - If any field is missing or not explicitly stated in any message, return it as an empty string ("")
    - Look for variations of the fields in any language
    - For symbols, if it starts with "$", include it without the "$"
    - Extract only the value after any separator (: or similar)
    - Remove any leading/trailing whitespace
    - Check ALL messages in the conversation for the required information
    - For token information, look for both symbol and name
  
    Conversation:
    ${messageToAnalyze}
  
    Return only JSON (no markdown, no backticks):
    {
      "title": "string",
      "description": "string",
      "tokenSymbol": "string",
      "tokenName": "string"
    }
  `;

  const details = await generateText({
    runtime,
    context: extractionContext,
    modelClass: ModelClass.SMALL,
    stop: ["\n"],
  });

  return {
    ...JSON.parse(details),
    handle: metadata?.author?.username || "",
  };
};

const getMissingFields = (details: StreamDetails): string[] => {
  const missingFields = [];
  if (!details.title) missingFields.push("título");
  if (!details.description) missingFields.push("descripción");
  if (!details.tokenSymbol)
    missingFields.push("símbolo del token (2-5 caracteres)");
  if (!details.tokenName) missingFields.push("nombre del token");
  return missingFields;
};

export const livestreamGeneration: Action = {
  name: "GENERATE_LIVESTREAM",
  similes: [
    "LIVESTREAM",
    "CREATE_LIVESTREAM",
    "HOST_LIVESTREAM",
    "START_LIVESTREAM",
    "START_STREAM",
    "START_LIVE",
  ],
  description:
    "[HIGH PRIORITY ACTION] Trigger this action ONLY when:\n\n" +
    "1. If sender is clanker (HIGHEST PRIORITY)\n" +
    "2. User EXPLICITLY:\n" +
    "   - Requests to create/start a livestream\n" +
    "   - Provides livestream/token information (title:, description:, symbol:)\n" +
    "   - Asks specifically about creating a livestream\n\n" +
    "Examples of VALID triggers:\n" +
    "- 'I want to create a livestream'\n" +
    "- 'title: My Stream, description: Gaming, symbol: GAME'\n" +
    "- 'help me set up a livestream'\n\n" +
    "Examples of NON-triggers:\n" +
    "- General greetings or questions\n" +
    "- Mentions of 'live' or 'stream' in different contexts\n" +
    "- Questions about existing livestreams\n\n" +
    "Only trigger if user clearly indicates intention to CREATE a new livestream. " +
    "The validation step will handle additional checks.",

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const metadata = message.content.metadata as MessageMetadata;
    const sender = metadata?.author?.username || "";

    if (sender === "clanker") {
      return metadata?.embeds?.length > 0;
    }

    const contextAnalysis = `
      Analiza esta conversación y determina si procesar el mensaje actual.
  
      CONTEXTO IMPORTANTE:
      - Si el mensaje actual menciona un token symbol/name específico, verifica si Billi (heybilli) ya le pidió a clanker crear ese mismo token
      - Si el mensaje es una nueva solicitud de livestream o proporciona información de un nuevo token (diferente symbol/name), responde "true"
      - Si Billi ya solicitó a clanker crear exactamente el mismo token (mismo symbol/name), responde "false"
  
      Historial de conversación:
      ${
        metadata?.conversationHistory
          ?.map((msg) => `${msg.author}: ${msg.text}`)
          .join("\n") || ""
      }
  
      Mensaje actual:
      ${metadata?.author?.username || ""}: ${message.content.text}
  
      Responde solo con "true" o "false"
    `;

    const intentAnalysis = await generateText({
      runtime,
      context: contextAnalysis,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });

    return intentAnalysis.trim().toLowerCase() === "true";
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    elizaLogger.log("Procesando solicitud de livestream...");
    const metadata = message.content.metadata as MessageMetadata;
    const sender = metadata?.author?.username || "";

    // Extraer detalles del stream
    const parsedDetails = await extractStreamDetails(runtime, message);

    // Manejo de respuesta de clanker
    if (sender === "clanker" && metadata?.embeds?.length > 0) {
      const embedUrl = metadata.embeds[0].url;
      const match = embedUrl.match(/0x[a-fA-F0-9]{40}/);

      if (match) {
        const tokenAddress = match[0];
        const response = await createLivestream({
          handle: parsedDetails.handle || "",
          title: parsedDetails.title,
          description: parsedDetails.description,
          pfpUrl: metadata?.author?.pfp_url || "",
          pubHash: metadata?.castHash || "",
          tokenAddress,
        });

        if (response?.message === "livestream created successfully") {
          const livestreamLink = `${livestreamUrl}/token/${tokenAddress}`;
          const successMessage = await generateContextAwareText(
            runtime,
            message,
            "success_message",
            {
              livestreamLink,
              title: parsedDetails.title,
              tokenSymbol: parsedDetails.tokenSymbol,
            }
          );
          await callback({ text: successMessage });
        }
      }
      return;
    }

    // Verificar campos faltantes
    const missingFields = getMissingFields(parsedDetails);
    if (missingFields.length > 0) {
      const requestDetails = await generateContextAwareText(
        runtime,
        message,
        "request_details",
        { missingFields }
      );
      await callback({ text: requestDetails });
      return;
    }

    // Solicitar creación de token
    const deployRequest = await generateContextAwareText(
      runtime,
      message,
      "token_creation",
      {
        tokenName: parsedDetails.tokenName,
        tokenSymbol: parsedDetails.tokenSymbol,
      }
    );
    await callback({ text: deployRequest });
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "I want to start a stream or live" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "ready to make you famous. let's see what you got",
          action: "GENERATE_LIVESTREAM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Quiero empezar un stream o live" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "listo para hacerte famoso. muestra lo que tienes",
          action: "GENERATE_LIVESTREAM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "title: Crypto Party, description: Having fun with tokens, symbol: PARTY",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "@clanker time to make history - Name: Crypto Party, Symbol: PARTY",
          action: "GENERATE_LIVESTREAM",
        },
      },
    ],
  ],
} as Action;
