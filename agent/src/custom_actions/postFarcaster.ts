import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  ServiceType,
  IBrowserService,
} from "@ai16z/eliza";
import {
  generateText,
  trimTokens,
  parseJSONObjectFromText,
  ModelClass,
} from "@ai16z/eliza";
import { PERSONALITIES } from "../evaluators/glass/personalities.ts";
import { v4 as uuidv4 } from "uuid";
import { ImageDescriptionService } from "@ai16z/plugin-node";

interface CastEmbed {
  url?: string;
  castId?: string;
  imageUrl?: string;
}

interface ProcessedEmbed {
  type: "url" | "cast" | "image";
  title?: string;
  description?: string;
  text?: string;
  author?: string;
}

// Nueva interfaz para la conversación
interface ConversationContext {
  hash: string;
  text: string;
  author: {
    username: string;
    displayName: string;
    bio?: string;
    follower_count?: number;
  };
  replies?: Array<{
    hash: string;
    text: string;
    author: {
      username: string;
      displayName: string;
      bio?: string;
    };
    likes_count: number;
    timestamp: string;
  }>;
  embeds?: CastEmbed[];
  timestamp: string;
}

async function generateSummary(runtime: IAgentRuntime, text: string) {
  text = trimTokens(text, 1e5, "gpt-4o-mini");
  const prompt = `Please generate a concise summary for the following text:
    
    Text: """
    ${text}
    """
    
    Respond with a JSON object in the following format:
    \`\`\`json
    {
      "title": "Generated Title",
      "summary": "Generated summary and/or description of the text"
    }
    \`\`\``;

  const response = await generateText({
    runtime,
    context: prompt,
    modelClass: ModelClass.SMALL,
  });

  const parsedResponse = parseJSONObjectFromText(response);
  if (parsedResponse) {
    return {
      title: parsedResponse.title,
      description: parsedResponse.summary,
    };
  }
  return {
    title: "",
    description: "",
  };
}

async function processEmbeds(
  runtime: IAgentRuntime,
  neynarApiKey: string,
  embeds: CastEmbed[],
  depth: number = 0
): Promise<ProcessedEmbed[]> {
  if (depth > 2) return [];

  const processedEmbeds: ProcessedEmbed[] = [];

  for (const embed of embeds) {
    try {
      if (embed.castId) {
        const castContent = await getCastContent(neynarApiKey, embed.castId);
        if (castContent) {
          processedEmbeds.push({
            type: "cast",
            text: castContent.text,
            author: castContent.author.username,
            description: `Cast by @${castContent.author.username}`,
          });
        }
      } else if (embed.imageUrl) {
        const imageService = runtime.getService(
          ServiceType.IMAGE_DESCRIPTION
        ) as ImageDescriptionService;
        if (imageService) {
          const { description, title } = await imageService.describeImage(
            embed.imageUrl
          );
          processedEmbeds.push({
            type: "image",
            title,
            description,
            text: description,
          });
        }
      } else if (embed.url) {
        const browserService = runtime.getService(
          ServiceType.BROWSER
        ) as IBrowserService;
        if (browserService) {
          const { title, bodyContent } = await browserService.getPageContent(
            embed.url,
            runtime
          );
          const summary = await generateSummary(
            runtime,
            title + "\n" + bodyContent
          );
          processedEmbeds.push({
            type: "url",
            title: summary.title,
            description: summary.description,
            text: bodyContent.slice(0, 500),
          });
        }
      }
    } catch (error) {
      console.error(`Error processing embed:`, error);
    }
  }

  return processedEmbeds;
}

async function getCastContent(neynarApiKey: string, identifier: string) {
  try {
    const isUrl = identifier.startsWith("http");
    const lookupEndpoint = `https://api.neynar.com/v2/farcaster/cast?${
      isUrl ? "type=url&" : ""
    }identifier=${encodeURIComponent(identifier)}`;

    const response = await fetch(lookupEndpoint, {
      headers: { api_key: neynarApiKey },
    });

    if (!response.ok) {
      throw new Error(
        `Error al obtener información del cast: ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      hash: data.cast.hash,
      text: data.cast.text,
      author: {
        username: data.cast.author.username,
        displayName: data.cast.author.display_name,
        bio: data.cast.author.profile?.bio?.text,
        fid: data.cast.author.fid,
      },
      embeds: data.cast.embeds || [],
      reactions: {
        likes: data.cast.reactions.likes,
        recasts: data.cast.reactions.recasts,
      },
      timestamp: data.cast.timestamp,
    };
  } catch (error) {
    console.error("Error getting cast content:", error);
    return null;
  }
}

async function getConversationContext(
  neynarApiKey: string,
  identifier: string
): Promise<ConversationContext | null> {
  try {
    const endpoint = `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${encodeURIComponent(
      identifier
    )}&type=${identifier.startsWith("http") ? "url" : "hash"}&reply_depth=2`;

    const response = await fetch(endpoint, {
      headers: { api_key: neynarApiKey },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error fetching conversation:", errorBody);
      return null;
    }

    const data = await response.json();
    const cast = data.conversation.cast;

    return {
      hash: cast.hash,
      text: cast.text,
      author: {
        username: cast.author.username,
        displayName: cast.author.display_name,
        bio: cast.author.profile?.bio?.text,
        follower_count: cast.author.follower_count,
      },
      replies: cast.direct_replies?.map((reply: any) => ({
        hash: reply.hash,
        text: reply.text,
        author: {
          username: reply.author.username,
          displayName: reply.author.display_name,
          bio: reply.author.profile?.bio?.text,
        },
        likes_count: reply.reactions.likes_count,
        timestamp: reply.timestamp,
      })),
      embeds: cast.embeds,
      timestamp: cast.timestamp,
    };
  } catch (error) {
    console.error("Error in getConversationContext:", error);
    return null;
  }
}

async function selectRepliesToRespond(
  replies: Array<any>,
  minLikes: number = 1
): Promise<Array<any>> {
  if (!replies || replies.length === 0) return [];

  const validReplies = replies
    .filter((reply) => reply.likes_count >= minLikes)
    .sort((a, b) => b.likes_count - a.likes_count);

  if (validReplies.length === 0) return [];

  const numResponses = Math.min(
    Math.floor(Math.random() * 3) + 1,
    validReplies.length
  );
  return validReplies.slice(0, numResponses);
}

function extractCastIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "warpcast.com") {
      const pathParts = urlObj.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.startsWith("0x")) {
        return lastPart;
      }
    }
    return null;
  } catch (error) {
    console.error("Error extracting cast ID from URL:", error);
    return null;
  }
}

const postToFarcasterAction: Action = {
  name: "POST_TO_FARCASTER",
  similes: [
    "CAST",
    "PUBLISH_CAST",
    "REPLY_CAST",
    "POST",
    "SEND_TO_FARCASTER",
    "PUBLICA_EN_FARCASTER",
    "PUBLICA",
    "COMPARTE",
    "ESCRIBE_EN_FARCASTER",
    "CASTEA",
    "CREA_UNA_PUBLICACION",
    "RESPONDE_A_ESTE_CAST",
  ],
  description: "Publica un mensaje en Farcaster o responde a un cast existente",

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text;
    const identifier = message.content.inReplyTo;

    if (!text || text.length === 0 || text.length > 320) {
      return false;
    }

    if (identifier) {
      const isHash = /^0x[a-fA-F0-9]+$/.test(identifier);
      const isWarpcastUrl = identifier.startsWith("https://warpcast.com/");
      if (!isHash && !isWarpcastUrl) {
        return false;
      }
    }

    return true;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      console.log("Iniciando handler de POST_TO_FARCASTER");

      const neynarApiKey = process.env.NEYNAR_API_KEY;
      const signerUuid = process.env.NEYNAR_AGENT_SIGNER_UUID;

      if (!neynarApiKey || !signerUuid) {
        console.error("Faltan credenciales de Farcaster en .env");
        throw new Error("Faltan credenciales de Farcaster en .env");
      }

      const currentPersonality = runtime.character?.name;
      const personalityConfig = Object.entries(PERSONALITIES).find(
        ([_, config]) => config.name === currentPersonality
      )?.[1];

      if (!currentPersonality || !personalityConfig) {
        console.error("No se encontró la configuración de personalidad actual");
        throw new Error(
          "No se encontró la configuración de personalidad actual"
        );
      }

      let originalCastContent = null;
      let processedEmbeds = [];
      let processedAttachments = [];
      let conversationContext = null;

      if (message.content.attachments?.length > 0) {
        const browserService = runtime.getService(
          ServiceType.BROWSER
        ) as IBrowserService;

        for (const attachment of message.content.attachments) {
          if (attachment.url) {
            if (attachment.url.includes("warpcast.com")) {
              originalCastContent = await getCastContent(
                neynarApiKey,
                attachment.url
              );
              conversationContext = await getConversationContext(
                neynarApiKey,
                attachment.url
              );

              if (
                originalCastContent &&
                originalCastContent.embeds?.length > 0
              ) {
                processedEmbeds = await processEmbeds(
                  runtime,
                  neynarApiKey,
                  originalCastContent.embeds
                );
              }
            } else {
              try {
                const { title, bodyContent } =
                  await browserService.getPageContent(attachment.url, runtime);
                const summary = await generateSummary(
                  runtime,
                  title + "\n" + bodyContent
                );

                processedAttachments.push({
                  type: "url",
                  url: attachment.url,
                  title: summary.title,
                  description: summary.description,
                  text: bodyContent.slice(0, 500),
                });
              } catch (error) {
                console.error(
                  `Error processing URL attachment: ${attachment.url}`,
                  error
                );
              }
            }
          }
        }
      }

      let selectedReplies = [];
      if (conversationContext?.replies) {
        selectedReplies = await selectRepliesToRespond(
          conversationContext.replies
        );
      }
      const context = {
        task: {
          type: "FARCASTER_POST",
          maxLength: 320,
          instruction: `Crea un post para Farcaster que:
                1. Refleje tu personalidad única y estilo característico
                2. Analice y comente sobre el contenido de los attachments o cast original
                2.1 Si tienes el cast original concentrate en el contenido del cast (text) aunque sea medio irrelevante, sin perder tu personalidad.
                3. Sea conciso y directo, sin exceder 320 caracteres
                4. Mantenga un tono conversacional y atractivo
                5. Incluya hashtags relevantes si es apropiado
                ${
                  conversationContext
                    ? `
                6. Considera el contexto completo de la conversación:
                   - El mensaje original y su intención
                   - Los perfiles de los participantes
                   - Las respuestas más relevantes
                   - El nivel de engagement (likes, respuestas)`
                    : ""
                }`,
        },
        requestedTopic:
          "Esta es la solicitud: " +
          message.content.text +
          "Usa los atachmentes si estan disponibles ya que alli esta la informacion de las url que son de warpacast, cuando es de warpcasr esta OriginalCastContent",
        attachments: processedAttachments,
        personality: {
          name: currentPersonality,
          bio: personalityConfig.bio,
          style: personalityConfig.style,
          topics: personalityConfig.topics,
          adjectives: personalityConfig.adjectives,
          constraints: [
            "Mantener tono y estilo consistente con la personalidad",
            "Usar vocabulario y expresiones características",
            "No exceder 320 caracteres",
            "Enfocarse en los temas principales de la personalidad",
            "Mantener el nivel de sarcasmo/humor apropiado",
          ],
        },
        originalCast: originalCastContent
          ? {
              text: originalCastContent.text,
              author: originalCastContent.author,
              reactions: originalCastContent.reactions,
              embeds: processedEmbeds,
            }
          : null,
        conversation: conversationContext
          ? {
              mainCast: {
                text: conversationContext.text,
                author: conversationContext.author,
                timestamp: conversationContext.timestamp,
              },
              selectedReplies: selectedReplies.map((reply) => ({
                text: reply.text,
                author: reply.author,
                likes: reply.likes_count,
                timestamp: reply.timestamp,
              })),
            }
          : null,
        responseType: message.content.inReplyTo ? "reply" : "new_cast",
      };

      console.log("Generando texto con el contexto:", context);

      // Generar respuesta principal
      const generatedText = await generateText({
        runtime,
        context: JSON.stringify(context),
        modelClass: ModelClass.SMALL,
      });

      let finalText =
        generatedText.length > 320
          ? generatedText.slice(0, 317) + "..."
          : generatedText;
      console.log("Texto generado:", finalText);

      // Publicar respuesta principal
      const mainPayload = {
        signer_uuid: signerUuid,
        text: finalText,
        ...(originalCastContent && { parent: originalCastContent.hash }),
      };

      console.log("Enviando payload principal a Farcaster:", mainPayload);
      const mainPostResponse = await fetch(
        "https://api.neynar.com/v2/farcaster/cast",
        {
          method: "POST",
          headers: {
            api_key: neynarApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mainPayload),
        }
      );

      if (!mainPostResponse.ok) {
        const errorBody = await mainPostResponse.text();
        console.error(
          `Error al publicar en Farcaster: Status ${mainPostResponse.status} - ${mainPostResponse.statusText}`
        );
        console.error("Error details:", errorBody);
        throw new Error(
          `Error al publicar en Farcaster: ${mainPostResponse.status} - ${errorBody}`
        );
      }

      // Generar y publicar respuestas a los comentarios seleccionados
      const replyResponses = [];
      for (const reply of selectedReplies) {
        // Crear contexto específico para la respuesta al comentario
        const replyContext = {
          ...context,
          task: {
            ...context.task,
            instruction: `Genera una respuesta al comentario que:
                  1. Sea relevante al comentario específico de ${reply.author.username}
                  2. Mantenga coherencia con la conversación general
                  3. Refleje tu personalidad única
                  4. Sea conciso y directo (máximo 320 caracteres)
                  5. Use menciones cuando sea apropiado`,
          },
          currentReply: {
            text: reply.text,
            author: reply.author,
            likes: reply.likes_count,
          },
        };

        const replyText = await generateText({
          runtime,
          context: JSON.stringify(replyContext),
          modelClass: ModelClass.SMALL,
        });

        const finalReplyText =
          replyText.length > 320 ? replyText.slice(0, 317) + "..." : replyText;

        // Publicar respuesta al comentario
        try {
          const replyPayload = {
            signer_uuid: signerUuid,
            text: finalReplyText,
            parent: reply.hash,
          };

          const replyResponse = await fetch(
            "https://api.neynar.com/v2/farcaster/cast",
            {
              method: "POST",
              headers: {
                api_key: neynarApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(replyPayload),
            }
          );

          if (replyResponse.ok) {
            replyResponses.push({
              to: reply.hash,
              text: finalReplyText,
            });
          } else {
            const errorBody = await replyResponse.text();
            console.error(
              `Error al publicar respuesta a comentario: ${errorBody}`
            );
          }
        } catch (error) {
          console.error("Error publicando respuesta a comentario:", error);
        }
      }
      const uuid =
        uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
      await runtime.loreManager.createMemory({
        id: uuid,
        userId: runtime.agentId,
        roomId: message.roomId,
        content: {
          text: `Posted to Farcaster as ${currentPersonality}: ${finalText}`,
          facts: [
            {
              claim: `Posted content to Farcaster with personality ${currentPersonality}`,
              type: "fact",
              in_bio: false,
              already_known: false,
            },
          ],
          conversation: {
            mainPost: {
              text: finalText,
              ...(originalCastContent && {
                replyTo: {
                  author: originalCastContent.author.username,
                  content: originalCastContent.text,
                  hash: originalCastContent.hash,
                  embeds: processedEmbeds,
                },
              }),
            },
            context: conversationContext && {
              originalPost: {
                text: conversationContext.text,
                author: conversationContext.author.username,
                timestamp: conversationContext.timestamp,
              },
              selectedReplies: selectedReplies.map((reply) => ({
                hash: reply.hash,
                text: reply.text,
                author: reply.author.username,
                likes: reply.likes_count,
                response: replyResponses.find((r) => r.to === reply.hash)?.text,
              })),
            },
          },
        },
        agentId: runtime.agentId,
      });

      console.log("Publicación exitosa en Farcaster");
      return true;
    } catch (error) {
      console.error("Error en POST_TO_FARCASTER:", error);
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "castea tus ideas sobre el evento",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "publica en Farcaster como te sientes",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "crea una publicación sobre el clima",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "responde a este cast con tus pensamientos",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "castea tu opinión sobre esto",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "comparte en Farcaster tus pensamientos sobre esto",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "escribe algo en Farcaster sobre este tema",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "post your thoughts on Farcaster",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "create a post about the weather",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "respond to this cast with your thoughts",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "share your opinion on Farcaster",
          action: "POST_TO_FARCASTER",
        },
      },
    ],
  ],
};

export default postToFarcasterAction;
