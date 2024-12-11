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
}: {
  handle: string;
  title: string;
  description: string;
}) => {
  const body = { handle, title, description };
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

const tokenAddresses = [
  "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
  "0x0fd7a301b51d0a83fcaf6718628174d527b373b6",
  "0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825",
  "0x1185cb5122edad199bdbc0cbd7a0457e448f23c7",
];

const getRandomTokenAddress = () => {
  return tokenAddresses[Math.floor(Math.random() * tokenAddresses.length)];
};

export const requestLivestreamDetailsTemplate = `
You need to ask the user for the necessary details to create a livestream. 

Respond with a polite and concise message requesting the following details:
- Handle: Their unique username or identifier.
- Title: The title of the livestream.
- Description: A short description of the livestream.
- Token Symbol: The token they want to associate with the livestream.

Your response should be formatted as a message directly addressed to the user, without any extra context or explanation. Example format:
"To proceed, please provide the following details:
- Handle: Your unique username or identifier.
- Title: The title of your livestream.
- Description: A brief description of the livestream.
- Token Symbol: The token associated with the livestream."
`;

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
    elizaLogger.log("Generating livestream link...");

    // Obtener el username del autor de la metadata
    const username =
      (message.content.metadata as MessageMetadata)?.author?.username || "";

    const context = `
    Extract the following information from the message and respond with the extracted information in the following JSON format. 
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
      "tokenSymbol": "string"
    }
  `;

    console.log("Extracting details from message:", messageToAnalyze);
    const details = await generateText({
      runtime,
      context: extractionContext,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });

    const parsedDetails = JSON.parse(details);

    // Agregar el handle automáticamente
    parsedDetails.handle = username;

    elizaLogger.log("Livestream details:", details, parsedDetails);

    // Si el token es una dirección completa, extraer solo el símbolo
    if (parsedDetails.tokenSymbol?.startsWith("0x")) {
      parsedDetails.tokenSymbol = "BILLI"; // Default token si es una dirección
    }

    if (
      !details ||
      !parsedDetails.title ||
      !parsedDetails.description ||
      !parsedDetails.tokenSymbol
    ) {
      elizaLogger.log("Details are missing, asking for more information...");
      const messageIncompleteDetails = await generateText({
        runtime: _runtime,
        context: requestLivestreamDetailsTemplate,
        modelClass: ModelClass.SMALL,
        stop: ["\n"],
      });
      return messageIncompleteDetails;
    }

    const response = await createLivestream({
      handle: parsedDetails.handle,
      title: parsedDetails.title,
      description: parsedDetails.description,
    });

    if (response.message === "livestream created successfully") {
      const livestreamLink = `${livestreamUrl}/token/${getRandomTokenAddress()}`;
      elizaLogger.log("Livestream link generated:", livestreamLink);

      const responseWithLivestreamLink = await generateText({
        runtime: _runtime,
        context: `
        Identify the language of the message and respond in the same language: ${message.content.text}
        IMPORTANT: 
        - If the message is in Spanish, respond in Spanish. 
        - If the message is in English, respond in English. 
        - DO NOT mention language identification.
        - Use a friendly and excited tone.
        - Keep the response short and direct.
        
        Include this information in your response:
        - Livestream link: ${livestreamLink}
        - Title: ${parsedDetails.title}
        - Token: ${parsedDetails.tokenSymbol}
        `,
        modelClass: ModelClass.SMALL,
        stop: ["\n"],
      });

      console.log(
        "=== RESPONSE WITH LIVESTREAM LINK ===",
        responseWithLivestreamLink
      );
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
          text: "Please provide a title, description, and token symbol.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "handle: justbilli, title: broken the internet, description: classic, tokenSymbol: BILLI",
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
          text: "handle: justbilli, title: destruyendo el internet con mi primer live, description: classic, tokenSymbol: BILLI",
        },
      },
    ],
  ],
} as Action;
