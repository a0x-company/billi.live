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
import { LivestreamService } from "./services/livestream.ts";
import { StreamDetailsExtractor } from "./extractor.ts";
import { getCastByHash } from "../../clients/utils.ts";
import { MessageMetadata } from "./types.ts";
import { TokenService } from "./services/token.ts";

async function findClankerTokenAddress(
  parentHash: string | undefined
): Promise<string | undefined> {
  let currentHash = parentHash;

  while (currentHash) {
    const cast = await getCastByHash(currentHash);
    if (!cast) break;

    if (cast.cast.author.username === "clanker" && cast.cast.embeds?.[0]?.url) {
      const tokenAddress =
        cast.cast.embeds[0].url.match(/0x[a-fA-F0-9]{40}/)?.[0];
      if (tokenAddress) return tokenAddress;
    }

    currentHash = cast.cast.parent_hash;
  }

  return undefined;
}

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
        - Intent to start/begin an existing stream = "true"
        - Already processed token or unrelated = "false"
        
        VALID INTENTS:
        - Creating new livestream
        - Providing stream/token details
        - Starting/initiating an existing stream
        - Any expression indicating readiness to go live
        - Any language or way of expressing desire to begin streaming
        
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
    const tokenService = new TokenService();
    const detailsExtractor = new StreamDetailsExtractor(runtime);

    const metadata = message.content.metadata as MessageMetadata;
    const sender = metadata?.author?.username;
    const castHash = metadata?.castHash;
    const threadHash = metadata?.threadHash;

    const isStartStreamIntent = await generateText({
      runtime,
      context: `
        Analyze if this message indicates an intention to START an existing stream (not create a new one).
        Message: ${message.content.text}
        Respond only with "true" or "false"
      `,
      modelClass: ModelClass.SMALL,
      stop: ["\n"],
    });

    if (
      isStartStreamIntent.trim().toLowerCase() === "true" &&
      metadata.parentHash
    ) {
      const tokenAddress = await findClankerTokenAddress(metadata.parentHash);
      if (tokenAddress) {
        const livestreamInfo =
          await livestreamService.getLivestreamByTokenAddress(tokenAddress);
        if (livestreamInfo) {
          await livestreamService.updateStreamedByAgent(tokenAddress, true);

          const startMessage = await textGenerator.generateContextAwareText(
            message,
            "start_stream",
            {
              livestreamLink: `${livestreamUrl}/token/${tokenAddress}`,
              handle: livestreamInfo.handle,
            }
          );

          await callback({
            text: startMessage,
            replyTo: livestreamInfo.castHash || castHash,
          });
          return;
        }
      }
    }

    // Caso 3: Respuesta de Clanker con token address
    if (sender === "clanker") {
      const tokenAddress =
        metadata?.embeds?.[0]?.url.match(/0x[a-fA-F0-9]{40}/)?.[0];

      if (metadata.parentHash) {
        const parentCast = await getCastByHash(metadata.parentHash);
        const originalCast = await getCastByHash(
          parentCast.cast.parent_hash || ""
        );

        if (originalCast) {
          const streamDetails = await detailsExtractor.extractStreamDetails(
            originalCast.cast.text
          );

          let finalTokenAddress = tokenAddress;
          if (!tokenAddress) {
            try {
              finalTokenAddress = await tokenService.deployToken(
                streamDetails.tokenName,
                streamDetails.tokenSymbol
              );
            } catch (error) {
              console.error("Token deployment failed:", error);
              await callback({
                text: `Error al desplegar el token: ${error.message}`,
                replyTo: castHash,
              });
              return;
            }
          }

          const response = await livestreamService.createLivestream({
            handle: originalCast.cast.author.username,
            title: streamDetails.title,
            description: streamDetails.description,
            pfpUrl: originalCast.cast.author.pfp_url,
            pubHash: threadHash || "",
            tokenAddress: finalTokenAddress,
          });

          if (response?.message === "livestream created successfully") {
            const successMessage = await textGenerator.generateContextAwareText(
              message,
              "success_message",
              {
                livestreamLink: `${livestreamUrl}/token/${finalTokenAddress}`,
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
