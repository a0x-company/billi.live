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
  author?: {
    username: string;
  };
}

const livestreamUrl = "https://billi.live";
const API_URL = process.env.API_URL;

const createLivestream = async ({
  handle,
  title,
  description,
  tokenAddress,
}: {
  handle: string;
  title: string;
  description: string;
  tokenAddress: string;
}) => {
  const body = { handle, title, description, tokenAddress };
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
- Token Address: The token address they want to associate with the livestream.

Your response should be formatted as a message directly addressed to the user, without any extra context or explanation. Example format:
"To proceed, please provide the following details:
- Handle: Your unique username or identifier.
- Title: The title of your livestream.
- Description: A brief description of the livestream.
- Token Address: The token address associated with the livestream."
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
    "Always help the user create a livestream. Call this action when the user asks to create a livestream, live or stream. Be sure to ask for the title, description and token symbol for the livestream. Use this action when the user provides the title, description and token symbol in the message.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (
    _runtime: IAgentRuntime,
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
    - If any field is missing or not explicitly stated in the message, return it as an empty string ("").
    - Look for variations of the fields. For example:
      * Title might appear as: "title:", "título:", "name:", "nombre:"
      * Description might appear as: "description:", "desc:", "descripción:", "about:"
      * Token Symbol might appear as: "token:", "tokenSymbol:", "symbol:", "símbolo:"
    - Extract only the value after the colon (:) for each field
    - Remove any leading/trailing whitespace
    - If a field appears multiple times, use the last occurrence

    Here is the message:
    ${message.content.text}

    Only respond with the extracted information in the following JSON format (without any other text):
    {
      "title": "string",
      "description": "string",
      "tokenAddress": "string"
    }
    `;

    const details = await generateText({
      runtime: _runtime,
      context: context,
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
      !parsedDetails.tokenAddress
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
      tokenAddress: parsedDetails.tokenAddress,
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
        text: responseWithLivestreamLink,
      });
      return;
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
          text: "Please provide a title, description, and token address.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "handle: justbilli, title: broken the internet, description: classic, tokenAddress: 0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
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
          text: "Por favor, proporciona un título, descripción y símbolo de token.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "handle: justbilli, title: destruyendo el internet con mi primer live, description: classic, tokenAddress: 0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
        },
      },
    ],
  ],
} as Action;
