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
  description: "Always help the user create a livestream.",
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

    const context = `
    Extract the following information from the message and respond with the extracted information in the following JSON format. 
    IMPORTANT: If any field is missing or not explicitly stated in the message, return it as an empty string (""). Do not infer or assume any value.
    The fields to extract are:
    - Handle
    - Title
    - Description
    - Token Symbol

    Here is the message:
    ${message.content.text}

    Only respond with the extracted information in the following JSON format (without any other text):
    {
      "handle": "string",
      "title": "string",
      "description": "string",
      "tokenSymbol": "string"
    }
    `;

    const details = await generateText({
      runtime: _runtime,
      context: context,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });

    const parsedDetails = JSON.parse(details);

    elizaLogger.log("Livestream details:", details, parsedDetails);

    if (
      !details ||
      !parsedDetails.handle ||
      !parsedDetails.title ||
      !parsedDetails.description ||
      !parsedDetails.tokenSymbol
    ) {
      elizaLogger.log("Details are missing, asking for more information...");
      // const messageIncompleteDetails = await generateText({
      //   runtime: _runtime,
      //   context: `The details provided are incorrect. Please provide a handle, title, description and token symbol for create a your livestream. IMPORTANT: SHORT RESPONSES, NO EXTRA TEXT.`,
      //   modelClass: ModelClass.SMALL,
      //   stop: ["\n"],
      // });
      // callback({
      //   text: messageIncompleteDetails,
      // });
      return false;
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
        context: `Identify the language of the message and respond in the same language: ${message.content.text}.
        IMPORTANT: If the message is in Spanish, respond in Spanish. If the message is in English, respond in English. NOT RESPOND LANGUAGE IDENTIFICATION. Respond with short sentences.
        Livestream link generated: ${livestreamLink}`,
        modelClass: ModelClass.SMALL,
        stop: ["\n"],
      });
      callback({
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
          text: "Por favor, proporciona un título, descripción y símbolo de token.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "handle: justbilli, title: destruyendo el internet con mi primer live, description: classic, tokenSymbol: BILLI",
        },
      },
    ],
  ],
} as Action;
