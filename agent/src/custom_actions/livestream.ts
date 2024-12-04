import {
  Action,
  elizaLogger,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@ai16z/eliza";

const shouldStartLivestreamTemplate = `
Here is the link to start recording your stream. 
{{livestreamHostUrl}}

Here is the link to watch the livestream.
{{livestreamViewerUrl}}
`;

const livestreamUrl = "https://billi-live.vercel.app";

export const livestreamGeneration: Action = {
  name: "GENERATE_LIVESTREAM_LINK",
  similes: ["LIVESTREAM_LINK", "CREATE_LIVESTREAM", "HOST_LIVESTREAM"],
  description: "Genera un enlace para alojar un livestream.",
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
    elizaLogger.log("Generando enlace para livestream...");

    const text = message.content.text.toLowerCase();
    const hasToken = /0x[a-fA-F0-9]{40}/.test(text);
    const tokenMatch = text.match(/0x[a-fA-F0-9]{40}/);

    if (!hasToken) {
      return;
    }

    const hostUrl = `${livestreamUrl}/livestream`;
    const viewerUrl = `${livestreamUrl}/token/${tokenMatch[0]}`;
    const userId = runtime.agentId;

    elizaLogger.log("User ID:", userId);
    elizaLogger.log("Enlace de livestream generado:", livestreamUrl);

    const templateExample = `
    Te dejo el link para que puedas empezar a grabar tu stream. 
    ${hostUrl}

    Y este es el link para que puedas ver el stream en vivo.
    ${viewerUrl}
    `;

    callback(
      {
        text: templateExample,
        attachments: [],
      },
      []
    );
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Crea un enlace para un livestream 0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: `Te dejo el link para que puedas empezar a grabar tu stream. ${livestreamUrl}/livestream\n\nY este es el link para que puedas ver el stream en vivo.\n${livestreamUrl}/token/0x1234567890abcdef1234567890abcdef12345678}`,
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Para crear un enlace para un livestream, por favor proporciona una dirección del token.",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "To create a livestream link, please provide an address of token that starts with '0x'.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I want to start a stream or live" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "To start a stream or live, please provide an address of token.",
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
          text: "Para empezar un stream o live, por favor proporciona una dirección del token.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you create a livestream link for me 0xabcdefabcdefabcdefabcdefabcdefabcdef",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: `Here is the link to start recording your stream. ${livestreamUrl}/livestream\n\nAnd this is the link to watch the livestream.\n${livestreamUrl}/token/0xabcdefabcdefabcdefabcdefabcdefabcdef`,
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I need a link for a livestream" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "To create a livestream link, please provide an address of token that starts with '0x'.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Start a livestream for me 0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: `Here is the link to start recording your stream. ${livestreamUrl}/livestream\n\nAnd this is the link to watch the livestream.\n${livestreamUrl}/token/0x1234567890abcdef1234567890abcdef12345678`,
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I want to go live 0xabcdefabcdefabcdefabcdefabcdefabcdef",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: `Here is the link to start recording your stream. ${livestreamUrl}/livestream\n\nAnd this is the link to watch the livestream.\n${livestreamUrl}/token/0xabcdefabcdefabcdefabcdefabcdefabcdef`,
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create a livestream link for 0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: `Here is the link to start recording your stream. ${livestreamUrl}/livestream\n\nAnd this is the link to watch the livestream.\n${livestreamUrl}/token/0x1234567890abcdef1234567890abcdef12345678`,
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Can you help me with a livestream link?" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "To create a livestream link, please provide an address of token that starts with '0x'.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I want to start a live stream" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "To start a live stream, please provide an address of token.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Please create a livestream link for me" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "To create a livestream link, please provide an address of token that starts with '0x'.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I need a link to start my stream 0xabcdefabcdefabcdefabcdefabcdefabcdef",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: `Here is the link to start recording your stream. ${livestreamUrl}/livestream\n\nAnd this is the link to watch the livestream.\n${livestreamUrl}/token/0xabcdefabcdefabcdefabcdefabcdefabcdef`,
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Can you generate a livestream link?" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "To create a livestream link, please provide an address of token that starts with '0x'.",
          action: "GENERATE_LIVESTREAM_LINK",
        },
      },
    ],
  ],
} as Action;
