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
import { getCastByHash } from "../clients/utils";

interface MessageMetadata {
  castHash?: string;
  author?: {
    username: string;
    pfp_url: string;
  };
  embeds?: {
    url: string;
  }[];
  parentHash?: string;
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
  const personalityContext = `
    You are ${runtime.character.name}.
    
    YOUR PERSONALITY (STAY TRUE TO THIS):
    - Core traits: ${runtime.character.adjectives.join(", ")}
    - Writing style: ${runtime.character.style.chat.join(", ")}
    - Your essence: ${
      Array.isArray(runtime.character.bio)
        ? runtime.character.bio.join(" ")
        : runtime.character.bio
    }
    - Your background: ${runtime.character.lore.join(" ")}
  `;

  const contextTemplate = {
    request_details: `
      ${personalityContext}
      
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
      ${personalityContext}
      
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
      ${personalityContext}
      
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
  text: string
): Promise<StreamDetails> => {
  const extractionContext = `
    Extract the following information and respond with JSON format.
    
    IMPORTANT: 
    - Return ONLY the JSON object
    - Empty string ("") for missing fields
    - Include $ in symbols
    - Extract values after any separator (: or similar)
    - Remove leading/trailing whitespace
  
    Text to analyze:
    ${text}
  
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

  return JSON.parse(details);
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
    "Only trigger if user clearly indicates intention to CREATE a new livestream.",

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const metadata = message.content.metadata as MessageMetadata;
    const sender = metadata?.author?.username;

    if (sender === "clanker") {
      return metadata?.embeds?.length > 0;
    }

    const contextAnalysis = `
      ${runtime.character.name} here. Analyze if I should process this message.
      
      IMPORTANT:
      - New livestream request or new token info = "true"
      - Already processed token or unrelated = "false"
      
      Message: ${message.content.text}
      
      Respond only with "true" or "false"
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
    const metadata = message.content.metadata as MessageMetadata;
    const sender = metadata?.author?.username;
    const castHash = metadata?.castHash;

    // Caso 3: Respuesta de Clanker con token address
    if (sender === "clanker" && metadata?.embeds?.length > 0) {
      const tokenAddress =
        metadata.embeds[0].url.match(/0x[a-fA-F0-9]{40}/)?.[0];

      if (tokenAddress && metadata.parentHash) {
        const parentCast = await getCastByHash(metadata.parentHash);
        const originalCast = await getCastByHash(
          parentCast.cast.parent_hash || ""
        );

        if (originalCast) {
          const streamDetails = await extractStreamDetails(
            runtime,
            originalCast.cast.text
          );

          const response = await createLivestream({
            handle: originalCast.cast.author.username,
            title: streamDetails.title,
            description: streamDetails.description,
            pfpUrl: originalCast.cast.author.pfp_url,
            pubHash: castHash || "",
            tokenAddress,
          });

          if (response?.message === "livestream created successfully") {
            const successMessage = await generateContextAwareText(
              runtime,
              message,
              "success_message",
              {
                livestreamLink: `${livestreamUrl}/token/${tokenAddress}`,
                title: streamDetails.title,
                tokenSymbol: streamDetails.tokenSymbol,
              }
            );
            await callback({
              text: successMessage,
              replyTo: castHash,
            });
          }
        }
      }
      return;
    }

    // Caso 1 y 2: Usuario solicita stream o proporciona datos
    const streamDetails = await extractStreamDetails(
      runtime,
      message.content.text
    );
    const missingFields = getMissingFields(streamDetails);

    if (missingFields.length > 0) {
      // Caso 1: Faltan detalles
      const requestMessage = await generateContextAwareText(
        runtime,
        message,
        "request_details",
        { missingFields }
      );
      await callback({
        text: requestMessage,
        replyTo: castHash,
      });
    } else {
      // Caso 2: Tenemos todos los datos
      const deployMessage = await generateContextAwareText(
        runtime,
        message,
        "token_creation",
        {
          tokenName: streamDetails.tokenName,
          tokenSymbol: streamDetails.tokenSymbol,
        }
      );
      await callback({
        text: deployMessage,
        replyTo: castHash,
        fromAction: true,
      });
    }
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
