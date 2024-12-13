import {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
  generateText,
} from "@ai16z/eliza";
import { TextGenerator } from "./text-generator.ts";
import { LivestreamService } from "./service.ts";
import { StreamDetailsExtractor } from "./extractor.ts";
import { getCastByHash } from "../../clients/utils.ts";
import { MessageMetadata } from "./types.ts";

const livestreamUrl = "https://billi.live";
const API_URL = process.env.API_URL;

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
    const textGenerator = new TextGenerator(runtime);
    const livestreamService = new LivestreamService(API_URL);
    const detailsExtractor = new StreamDetailsExtractor(runtime);

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
          const streamDetails = await detailsExtractor.extractStreamDetails(
            originalCast.cast.text
          );

          const response = await livestreamService.createLivestream({
            handle: originalCast.cast.author.username,
            title: streamDetails.title,
            description: streamDetails.description,
            pfpUrl: originalCast.cast.author.pfp_url,
            pubHash: castHash || "",
            tokenAddress,
          });

          if (response?.message === "livestream created successfully") {
            const successMessage = await textGenerator.generateContextAwareText(
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
    const streamDetails = await detailsExtractor.extractStreamDetails(
      message.content.text
    );
    const missingFields = livestreamService.getMissingFields(streamDetails);

    if (missingFields.length > 0) {
      // Caso 1: Faltan detalles
      const requestMessage = await textGenerator.generateContextAwareText(
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
      const deployMessage = await textGenerator.generateContextAwareText(
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
