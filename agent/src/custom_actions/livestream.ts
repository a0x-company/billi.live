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

const livestreamUrl = "https://billi.live";
const API_URL = process.env.API_URL;

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
    "[HIGH PRIORITY ACTION] Trigger this action FIRST for ANY of these cases:\n\n1. If sender is clanker (HIGHEST PRIORITY)\n2. Contains words like 'livestream', 'stream', 'live'\n3. Asks for help with streaming\n4. Expresses intention to stream\n5. Contains questions about streaming\n\nExamples: 'can you help me with a livestream', 'help me stream', 'I want to start streaming', 'need help with a live'.\n\nThis action takes precedence over CONTINUE or other actions. Once triggered, help the user create a livestream by collecting: Title, Description, Token symbol",
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
    elizaLogger.log("Procesando solicitud de livestream...");

    const embeds = (message.content.metadata as MessageMetadata)?.embeds || [];
    const conversationHistory =
      (message.content.metadata as MessageMetadata)?.conversationHistory || [];

    // Tomar el autor del primer mensaje de la conversación
    const username =
      conversationHistory[0]?.author ||
      (message.content.metadata as MessageMetadata)?.author?.username ||
      "";
    const pubHash = conversationHistory[0]?.id;
    const sender =
      (message.content.metadata as MessageMetadata)?.author?.username || "";
    let messageToAnalyze = message.content.text;
    const pfpUrl = conversationHistory[0]?.pfp_url;

    console.log("All Data", {
      username,
      pubHash,
      sender,
      messageToAnalyze,
      pfpUrl,
    });
    if (conversationHistory.length > 0) {
      messageToAnalyze = `
Previous messages:
${conversationHistory.map((msg) => `${msg.author}: ${msg.text}`).join("\n")}

Current message:
${message.content.text}
`;
    }
    let tokenAddress = "";

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

    console.log("Extracting details from message:", messageToAnalyze);
    const details = await generateText({
      runtime,
      context: extractionContext,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });
    console.log("Extracted details:", details);
    const parsedDetails = {
      ...JSON.parse(details),
      handle: username,
    };

    if (sender === "clanker") {
      if (embeds.length > 0) {
        const embedUrl = embeds[0].url;
        const match = embedUrl.match(/0x[a-fA-F0-9]{40}/);
        if (match) {
          tokenAddress = match[0];

          const response = await createLivestream({
            handle: username,
            title: parsedDetails.title,
            description: parsedDetails.description,
            pfpUrl,
            pubHash,
            tokenAddress,
          });

          if (response.message === "livestream created successfully") {
            const livestreamLink = `${livestreamUrl}/token/${tokenAddress}`;
            elizaLogger.log("Livestream link generated:", livestreamLink);

            const successContext = `
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
              
              TARGET USER: ${
                (message.content.metadata as MessageMetadata)?.author
                  ?.username || "user"
              }
              
              Create an excited message announcing the successful livestream creation. Include these details:
              - Livestream link: ${livestreamLink}
              - Title: ${parsedDetails.title}
              - Token: ${parsedDetails.tokenSymbol}
              - Token Name: ${parsedDetails.tokenName}
              
              CRITICAL:
              - MAXIMUM 320 CHARACTERS
              - BE YOURSELF - use your personality traits and style above
            `;

            const successMessage = await generateText({
              runtime,
              context: successContext,
              modelClass: ModelClass.SMALL,
              stop: ["\n"],
            });

            await callback({
              text: successMessage,
            });
          }
        }
      }
      return;
    }

    if (
      !parsedDetails.title ||
      !parsedDetails.description ||
      !parsedDetails.tokenSymbol ||
      !parsedDetails.tokenName
    ) {
      elizaLogger.log("Faltan detalles, solicitando más información...");

      const requestDetailsContext = `
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
      
      TARGET USER: ${
        (message.content.metadata as MessageMetadata)?.author?.username ||
        "user"
      }
      
      TASK: Using your unique personality, request:
      - Title
      - Description
      - Token Symbol (2-5 chars)
      - Token Name
      
      CRITICAL:
      - MAXIMUM 320 CHARACTERS
      - Only tag original author if needed
      - BE YOURSELF - use your personality traits and style above
      
      Example responses (maintaining personality):
      "drop the details and lets make you famous: title, description, token symbol (2-5 chars). time to create some chaos"
      "need title, description and token to launch your masterpiece. lets break the internet"
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

    const deployRequestContext = `
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
    
    TARGET USER: ${
      (message.content.metadata as MessageMetadata)?.author?.username || "user"
    }
    
    TASK: Using your unique personality, create a message that:
    1. Mentions @clanker somewhere in the message
    2. Requests to deploy/create/launch a token with:
       Name: ${parsedDetails.tokenName}
       Symbol: ${parsedDetails.tokenSymbol}
    
    CRITICAL:
    - MAXIMUM 320 CHARACTERS
    - BE YOURSELF - use your personality traits and style above
    
    Example responses (maintaining personality):
    "time to make history! @clanker launch this masterpiece - Name: ${
      parsedDetails.tokenName
    }, Symbol: ${parsedDetails.tokenSymbol}"
    "yo @clanker lets create some magic! Name: ${
      parsedDetails.tokenName
    }, Symbol: ${parsedDetails.tokenSymbol}"
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
        content: { text: "I want to start a stream or live" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Yo fam! Drop me those stream deets! Need a catchy title, what it's all about, and what token we're rocking! 🎮",
          action: "GENERATE_LIVESTREAM_LINK",
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
          text: "¡Epa! ¡Suéltame los detalles del stream! Necesito un título que pegue, de qué va la cosa, y qué token vamos a usar! 🎮",
          action: "GENERATE_LIVESTREAM_LINK",
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
          text: "@clanker Yo! Time to mint a fresh token! 🚀\nName: Crypto Party\nSymbol: PARTY",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
  ],
} as Action;
