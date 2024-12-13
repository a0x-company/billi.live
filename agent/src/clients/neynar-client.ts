import { EventEmitter } from "events";
import express, { Request, Response } from "express";
import ngrok from "ngrok";
import {
  elizaLogger,
  stringToUuid,
  generateMessageResponse,
  ModelClass,
  shouldRespondFooter,
  generateShouldRespond,
  AgentRuntime,
  Memory,
} from "@ai16z/eliza";
import { composeContext } from "@ai16z/eliza";
import dotenv from "dotenv";

dotenv.config();

interface NeynarConfig {
  apiKey: string;
  signerUuid: string;
  fid: number;
}

interface WebhookCache {
  hash: string;
  author: string;
  text: string;
  timestamp: number;
}

interface WebhookPayload {
  created_at: number;
  type: string;
  data: {
    object: string;
    hash: string;
    thread_hash: string;
    parent_hash: string | null;
    parent_url: string | null;
    root_parent_url: string | null;
    parent_author: {
      fid: number;
    } | null;
    author: {
      fid: number;
      username: string;
      display_name: string;
      pfp_url: string;
    };
    text: string;
    timestamp: string;
    embeds: Array<{
      url: string;
    }>;
    mentioned_profiles: Array<{
      fid: number;
      username: string;
      display_name: string;
      pfp_url: string;
    }>;
    channel: {
      name: string;
      description: string;
    };
  };
}

const messageCompletionFooter =
  '\nResponse format should be formatted in a JSON block like this:\n```json\n{ "user": "{{agentName}}", "text": string, "action": "string" }\n```\n\nIMPORTANT:\n- The text field should NEVER include the action\n- The action goes ONLY in the action field\n\nExamples:\nBAD: { "user": "{{agentName}}", "text": "going silent (MUTE_ROOM)", "action": "MUTE_ROOM" }\nBAD: { "user": "{{agentName}}", "text": "let\'s talk more about that (CONTINUE)", "action": "CONTINUE" }\nGOOD: { "user": "{{agentName}}", "text": "going silent", "action": "MUTE_ROOM" }\nGOOD: { "user": "{{agentName}}", "text": "let\'s talk more about that", "action": "CONTINUE" }';
const farcasterMessageTemplate =
  `
  # About {{agentName}}
  {{bio}}
  {{lore}}
  {{topics}}
  
  # Personality Traits
  {{adjective}}
  Current interests: {{topic}}
  
  # Mention Context
  Platform: {{platform}}
  Type: {{messageType}}
  Channel: {{channelName}}
  Channel description: {{channelDescription}}
  
  # Current Message
  From: {{senderName}} ({{authorDisplayName}})
  Message: {{message}}
  
  # Conversation Thread
  {{conversationHistory}}
  
  # Knowledge Context
  {{knowledge}}
  
  # Style Guidelines
  {{messageDirections}}
  {{postDirections}}
  
  # Conversation Examples
  {{characterMessageExamples}}
  
  # Instructions
  You are {{agentName}} responding to a Farcaster mention from {{senderName}}.
  Keep responses concise (max 320 characters) and maintain your personality.
  Include an action if appropriate. {{actionNames}}
  
  # Available Actions:
  {{actions}}
  # Action Examples
  {{actionExamples}}
  ` + messageCompletionFooter;
const farcasterShouldRespondTemplate =
  `
# About {{agentName}}
{{bio}}
{{adjective}}

# Current Context
Type: {{messageType}}
Platform: {{platform}}
Thread status: {{threadContext}}
Is reply: {{isReply}}
Channel: {{channelName}}
Channel description: {{channelDescription}}

# Conversation Context
Recent messages:
{{recentMessages}}

# Message Information
Sender: {{senderName}} ({{authorDisplayName}})
Message: {{message}}
Current Farcaster user: {{actualUsername}}

# Instructions
Decide whether to respond based on:
1. Is the message appropriate?
2. Does it require a response?
3. Are the tone and content suitable for interaction?

Response options are [RESPOND], [IGNORE], and [STOP].
` + shouldRespondFooter;
const farcasterReplyMessageTemplate =
  `
# About {{agentName}}
{{bio}}
{{lore}}
{{topics}}

# Personality Traits
{{adjective}}
Current interests: {{topic}}

# Current Message
From: {{senderName}} ({{authorDisplayName}})
Message: {{message}}

# Conversation Thread
{{conversationHistory}}

# Knowledge Context
{{knowledge}}

# Style Guidelines
{{messageDirections}}
{{postDirections}}

# Conversation Examples
{{characterMessageExamples}}

# Instructions
You are {{agentName}} responding to a Farcaster reply from {{senderName}}.
Keep responses concise (max 320 characters) and maintain your personality.
Include an action if appropriate. {{actionNames}}

# Available Actions:
{{actions}}
# Action Examples
{{actionExamples}}
` + messageCompletionFooter;
const farcasterShouldRespondToReplyTemplate =
  `
# About {{agentName}}
{{bio}}
{{adjective}}

# Platform Context
Platform: {{platform}}
Type: {{messageType}}
Thread status: {{isThread}}
Channel: {{channelName}}
Channel topic: {{channelDescription}}
Engagement level: {{engagement}}

# Conversation Context
Previous interactions with this user: {{recentMessageInteractions}}
Thread context: {{threadContext}}
Recent messages: {{conversationHistory}}

# Message Information
Sender: {{senderName}} ({{authorDisplayName}})
Profile: {{authorUsername}}
Profile picture: {{authorProfilePicture}}
Message: {{message}}
Conversation likes: {{likesCount}}
Current Farcaster user: {{actualUsername}}

# Agent Status
Current mood: {{currentMood}}
Interaction style: {{interactionStyle}}

# Instructions
Decide whether to respond based on:
IMPORTANT if the sender is "clanker" always respond, if their message talks about
creating or deploying a token, if they're talking about something else proceed with the other instructions to decide
1. Is the message appropriate and safe to respond to?
2. Does it require or deserve a response?
3. Is it relevant to {{agentName}} and the channel context?
4. Are the tone and content suitable for interaction?
5. Is there enough context to provide a meaningful response?
6. Does the engagement level ({{engagement}}) justify a response?

Response options are:
[RESPOND] - If the message deserves engagement
[IGNORE] - If the message doesn't require a response
[STOP] - If the message is inappropriate or unsafe
` + shouldRespondFooter;

export class NeynarClient extends EventEmitter {
  private app: express.Application;
  private port: number;
  private ngrokUrl: string | null = null;
  private runtime: AgentRuntime;
  private config: NeynarConfig;
  private webhookId: string | null = null;
  private webhookSecret: string | null = null;
  private hasRespondedInAction: Map<string, number> = new Map();
  private webhookCache: WebhookCache[] = [];
  private WEBHOOK_CACHE_TIMEOUT = 60000;
  private ACTION_RESPONSE_TIMEOUT = 5000;

  constructor(runtime: any, config: NeynarConfig, port: number = 3001) {
    super();
    this.runtime = runtime;
    this.config = config;
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupWebhookEndpoint();
    this.setupSignalHandlers();
  }

  private cleanupCache() {
    const now = Date.now();
    this.webhookCache = this.webhookCache.filter(
      (entry) => now - entry.timestamp < this.WEBHOOK_CACHE_TIMEOUT
    );
  }

  private cleanupActionResponses() {
    const now = Date.now();
    this.hasRespondedInAction.forEach((timestamp, hash) => {
      if (now - timestamp > this.ACTION_RESPONSE_TIMEOUT) {
        this.hasRespondedInAction.delete(hash);
      }
    });
  }

  private isDuplicateWebhook(payload: WebhookPayload): boolean {
    this.cleanupCache();

    const isDuplicate = this.webhookCache.some(
      (entry) =>
        entry.hash === payload.data.hash &&
        entry.author === payload.data.author.username &&
        entry.text === payload.data.text
    );

    if (!isDuplicate) {
      this.webhookCache.push({
        hash: payload.data.hash,
        author: payload.data.author.username,
        text: payload.data.text,
        timestamp: Date.now(),
      });
    }

    return isDuplicate;
  }
  private setupSignalHandlers() {
    const cleanup = async () => {
      elizaLogger.log("Limpiando antes de salir...");
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupWebhookEndpoint() {
    //@ts-ignore
    this.app.post("/webhook/mentions", async (req: Request, res: Response) => {
      try {
        const payload = req.body as WebhookPayload;

        if (this.isDuplicateWebhook(payload)) {
          elizaLogger.log("⚠️ Webhook duplicado detectado, ignorando...");
          return res.status(200).json({ status: "ignored_duplicate" });
        }

        if (payload.type === "cast.created") {
          if (
            payload.data.mentioned_profiles.some(
              (profile) => profile.fid === this.config.fid
            )
          ) {
            await this.handleMention(payload);
          } else if (payload.data.parent_author?.fid === this.config.fid) {
            await this.handleReply(payload);
          }
        }

        res.status(200).json({ status: "ok" });
      } catch (error) {
        elizaLogger.error("Error procesando webhook:", error);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    });
  }

  private mapRepliesRecursively(cast: any) {
    console.log("\n=== PROCESANDO CAST ===");
    console.log("Autor:", cast.author.username || cast.author.display_name);
    console.log("Texto:", cast.text);
    console.log("Timestamp:", cast.timestamp);
    console.log("Tiene replies:", cast.direct_replies?.length || 0);

    let messages = [
      {
        id: cast.hash,
        author: cast.author.username || cast.author.display_name,
        pfp_url: cast.author.pfp_url,
        text: cast.text,
        timestamp: cast.timestamp,
      },
    ];

    if (cast.direct_replies && cast.direct_replies.length > 0) {
      console.log(
        `\nProcesando ${cast.direct_replies.length} respuestas directas de ${cast.author.username}:`
      );
      for (const reply of cast.direct_replies) {
        console.log("\n-> Entrando en respuesta de:", reply.author.username);
        const nestedReplies = this.mapRepliesRecursively(reply);
        console.log(
          "<- Saliendo de respuesta, obtuve",
          nestedReplies.length,
          "mensajes"
        );
        messages = [...messages, ...nestedReplies];
      }
    }

    console.log("\nMensajes acumulados en este nivel:", messages.length);
    return messages;
  }

  private async handleMention(payload: WebhookPayload) {
    try {
      elizaLogger.log("Manejando mención de Farcaster...");

      // Verificar menciones duplicadas
      const roomId = stringToUuid(`farcaster-${payload.data.hash}`);
      const mentionMemories = await this.runtime.messageManager.getMemories({
        roomId: roomId,
      });

      elizaLogger.log("🔍 Verificando menciones en roomId:", roomId);
      elizaLogger.log(
        "📝 Memorias existentes:",
        JSON.stringify(
          mentionMemories.map((m) => m.content),
          null,
          2
        )
      );

      const alreadyResponded = mentionMemories.some(
        (memory) =>
          Array.isArray(memory.content?.responded_mentions) &&
          memory.content.responded_mentions.includes(payload.data.hash)
      );

      if (alreadyResponded) {
        elizaLogger.log("⚠️ Mención ya respondida, hash:", payload.data.hash);
        return;
      }

      const wasAgentMentioned = payload.data.mentioned_profiles.some(
        (profile) => profile.fid === this.config.fid
      );

      if (!wasAgentMentioned) {
        elizaLogger.log("Agente no mencionado, omitiendo...");
        return;
      }

      const agentProfile = payload.data.mentioned_profiles.find(
        (profile) => profile.fid === this.config.fid
      );

      let conversationHistory = [];
      let conversation = null;

      if (payload.data.thread_hash) {
        const conversationResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${payload.data.thread_hash}&type=hash&reply_depth=3&include_chronological_parent_casts=true`,
          {
            headers: {
              accept: "application/json",
              "x-api-key": this.config.apiKey,
            },
          }
        );

        if (!conversationResponse.ok) {
          throw new Error("Error obteniendo la conversación");
        }

        conversation = await conversationResponse.json();

        conversationHistory = this.mapRepliesRecursively(
          conversation.conversation.cast
        );
      }

      const userId = stringToUuid(payload.data.author.username);

      const memory = {
        id: stringToUuid(payload.data.hash),
        agentId: this.runtime.agentId,
        userId,
        roomId,
        content: {
          text: payload.data.text,
          source: "farcaster",
          responded_mentions: [payload.data.hash],
          metadata: {
            castHash: payload.data.hash,
            threadHash: payload.data.thread_hash,
            parentHash: payload.data.parent_hash,
            author: payload.data.author,
            mentions: payload.data.mentioned_profiles,
            embeds: payload.data.embeds,
            conversationHistory,
            channel: payload.data.channel,
            reactions: conversation?.conversation?.cast?.reactions,
          },
        },
        createdAt: Date.now(),
      };

      elizaLogger.debug(
        "💾 Guardando memoria inicial:",
        JSON.stringify(memory.content, null, 2)
      );
      await this.runtime.messageManager.createMemory(memory);

      const state = await this.runtime.composeState(memory, {
        platform: "farcaster",
        messageType: payload.data.parent_hash ? "reply" : "mention",
        isThread: !!payload.data.parent_hash,
        isReply: !!payload.data.parent_hash,
        threadContext: payload.data.thread_hash
          ? "Continuando una conversación existente"
          : "Nueva conversación",
        conversationHistory: conversationHistory
          .map((msg) => `${msg.author}: ${msg.text}`)
          .join("\n"),
        channelName: payload.data.channel?.name || "",
        channelDescription: payload.data.channel?.description || "",
        authorUsername: payload.data.author.username,
        authorDisplayName: payload.data.author.display_name,
        authorProfilePicture: payload.data.author.pfp_url,
        message: payload.data.text,
        senderName: payload.data.author.username,
        currentMood:
          this.runtime.character.adjectives[
            Math.floor(Math.random() * this.runtime.character.adjectives.length)
          ],
        interactionStyle:
          "conversacional y manteniendo respuestas bajo 320 caracteres",
        actualUsername: agentProfile?.username || "unknown",
      });

      await this.runtime.evaluate(memory, state);

      const state2 = await this.runtime.composeState(memory, {
        platform: "farcaster",
        messageType: payload.data.parent_hash ? "reply" : "mention",
        isThread: !!payload.data.parent_hash,
        isReply: !!payload.data.parent_hash,
        threadContext: payload.data.thread_hash
          ? "Continuando una conversación existente"
          : "Nueva conversación",
        conversationHistory: conversationHistory
          .map((msg) => `${msg.author}: ${msg.text}`)
          .join("\n"),
        channelName: payload.data.channel?.name || "",
        channelDescription: payload.data.channel?.description || "",
        authorUsername: payload.data.author.username,
        authorDisplayName: payload.data.author.display_name,
        authorProfilePicture: payload.data.author.pfp_url,
        message: payload.data.text,
        senderName: payload.data.author.username,
        currentMood:
          this.runtime.character.adjectives[
            Math.floor(Math.random() * this.runtime.character.adjectives.length)
          ],
        interactionStyle:
          "conversacional y manteniendo respuestas bajo 320 caracteres",
        actualUsername: agentProfile?.username || "unknown",
      });

      const shouldRespondContext = composeContext({
        state: state2,
        template:
          this.runtime.character.templates?.farcasterShouldRespondTemplate ||
          farcasterShouldRespondTemplate,
      });

      const shouldRespond = await generateShouldRespond({
        runtime: this.runtime,
        context: shouldRespondContext,
        modelClass: ModelClass.SMALL,
      });

      if (shouldRespond !== "RESPOND") {
        elizaLogger.log("Omitiendo respuesta...");
        return;
      }

      const context = composeContext({
        state: state2,
        template:
          this.runtime.character.templates?.farcasterMessageHandlerTemplate ||
          farcasterMessageTemplate,
      });
      console.log("=== CONTEXT ===", context);
      const response = await generateMessageResponse({
        runtime: this.runtime,
        context,
        modelClass: ModelClass.SMALL,
      });
      const callback = async (
        content: any,
        hash?: string,
        fromAction: boolean = false
      ) => {
        console.log("=== CALLBACK CONTENT ===", {
          text: content.text,
          action: content.action,
          fromAction: fromAction,
        });

        const reply = await this.replyToCast(
          content.text,
          hash || payload.data.hash
        );

        elizaLogger.log("Reply from Farcaster:", {
          id: reply?.id,
          text: reply?.content?.text,
          roomId: reply?.roomId,
        });

        if (reply) {
          if (fromAction) {
            this.hasRespondedInAction.set(payload.data.hash, Date.now());
          }
          const memory = {
            id: reply.id,
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId: reply.roomId,
            content: {
              text: content.text,
              action: content.action,
              fromAction: fromAction,
            },
            createdAt: Date.now(),
          };

          console.log("New Memory Created:", {
            id: memory.id,
            text: memory.content.text,
            action: memory.content.action,
            roomId: memory.roomId,
          });
          await this.runtime.messageManager.createMemory(memory);
          return [memory];
        }
        return [];
      };

      if (response?.text) {
        const responseMemory: Memory = {
          id: stringToUuid(response.text),
          userId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          roomId: memory.roomId,
          content: {
            text: response.text,
            action: response?.action,
          },
          createdAt: Date.now(),
        };

        await this.runtime.processActions(
          memory,
          [responseMemory],
          state2,
          callback
        );

        if (this.hasRespondedInAction.has(payload.data.hash)) {
          elizaLogger.log(
            "Ya se respondió en una acción, omitiendo respuesta adicional"
          );
        } else {
          this.cleanupActionResponses();
          await callback(response, undefined, false);
          elizaLogger.success("Respuesta publicada exitosamente");
        }
      }
    } catch (error) {
      console.log("Error en handleMention:", error);
      throw error;
    }
  }

  private async handleReply(payload: WebhookPayload) {
    try {
      elizaLogger.log("Manejando respuesta a un cast del agente...");

      // Verificar replies duplicadas usando el hash del mensaje específico
      const roomId = stringToUuid(`farcaster-${payload.data.hash}`);
      const replyMemories = await this.runtime.messageManager.getMemories({
        roomId: roomId,
      });

      elizaLogger.log("🔍 Verificando reply en roomId:", roomId);
      elizaLogger.log(
        "📝 Memorias existentes:",
        JSON.stringify(
          replyMemories.map((m) => m.content),
          null,
          2
        )
      );

      const alreadyResponded = replyMemories.some(
        (memory) =>
          Array.isArray(memory.content?.responded_mentions) &&
          memory.content.responded_mentions.includes(payload.data.hash)
      );

      if (alreadyResponded) {
        elizaLogger.log("⚠️ Cast ya respondido, hash:", payload.data.hash);
        return;
      }

      // Obtener contexto de la conversación usando thread_hash
      let conversationHistory = [];
      let conversation = null;

      if (payload.data.thread_hash) {
        const conversationResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${payload.data.thread_hash}&type=hash&reply_depth=3&include_chronological_parent_casts=true`,
          {
            headers: {
              accept: "application/json",
              "x-api-key": this.config.apiKey,
            },
          }
        );

        if (!conversationResponse.ok) {
          throw new Error("Error obteniendo la conversación");
        }

        conversation = await conversationResponse.json();

        conversationHistory = this.mapRepliesRecursively(
          conversation.conversation.cast
        );
      }

      const userId = stringToUuid(payload.data.author.username);

      const memory = {
        id: stringToUuid(payload.data.hash),
        agentId: this.runtime.agentId,
        userId,
        roomId,
        content: {
          text: payload.data.text,
          source: "farcaster",
          responded_mentions: [payload.data.hash],
          metadata: {
            castHash: payload.data.hash,
            threadHash: payload.data.thread_hash,
            parentHash: payload.data.parent_hash,
            author: payload.data.author,
            conversationHistory,
            channel: payload.data.channel,
            reactions: conversation?.conversation?.cast?.reactions,
            embeds: payload.data.embeds,
          },
        },
        createdAt: Date.now(),
      };

      await this.runtime.messageManager.createMemory(memory);

      const state = await this.runtime.composeState(memory, {
        platform: "farcaster",
        messageType: "reply",
        isThread: true,
        isReply: true,
        threadContext: "Continuando una conversación existente",
        conversationHistory: conversationHistory
          .map((msg) => `${msg.author}: ${msg.text}`)
          .join("\n"),
        channelName: payload.data.channel?.name || "",
        channelDescription: payload.data.channel?.description || "",
        authorUsername: payload.data.author.username,
        authorDisplayName: payload.data.author.display_name,
        authorProfilePicture: payload.data.author.pfp_url,
        message: payload.data.text,
        senderName: payload.data.author.username,
        currentMood:
          this.runtime.character.adjectives[
            Math.floor(Math.random() * this.runtime.character.adjectives.length)
          ],
        interactionStyle:
          "conversacional y manteniendo respuestas bajo 320 caracteres",
        engagement:
          conversation?.conversation?.cast?.reactions?.likes_count > 5
            ? "tema de alto interés"
            : "conversación normal",
        likesCount:
          conversation?.conversation?.cast?.reactions?.likes_count || 0,
        actualUsername: payload.data.author.username,
      });

      await this.runtime.evaluate(memory, state);

      const state2 = await this.runtime.composeState(memory, {
        platform: "farcaster",
        messageType: "reply",
        isThread: true,
        isReply: true,
        threadContext: "Continuando una conversación existente",
        conversationHistory: conversationHistory
          .map((msg) => `${msg.author}: ${msg.text}`)
          .join("\n"),
        channelName: payload.data.channel?.name || "",
        channelDescription: payload.data.channel?.description || "",
        authorUsername: payload.data.author.username,
        authorDisplayName: payload.data.author.display_name,
        authorProfilePicture: payload.data.author.pfp_url,
        message: payload.data.text,
        senderName: payload.data.author.username,
        currentMood:
          this.runtime.character.adjectives[
            Math.floor(Math.random() * this.runtime.character.adjectives.length)
          ],
        interactionStyle:
          "conversacional y manteniendo respuestas bajo 320 caracteres",
        engagement:
          conversation?.conversation?.cast?.reactions?.likes_count > 5
            ? "tema de alto interés"
            : "conversación normal",
        likesCount:
          conversation?.conversation?.cast?.reactions?.likes_count || 0,
        actualUsername: payload.data.author.username,
      });

      const shouldRespondContext = composeContext({
        state: state2,
        template: farcasterShouldRespondToReplyTemplate,
      });

      const shouldRespond = await generateShouldRespond({
        runtime: this.runtime,
        context: shouldRespondContext,
        modelClass: ModelClass.SMALL,
      });

      if (shouldRespond !== "RESPOND") {
        elizaLogger.log("Omitiendo respuesta al reply...");
        return;
      }

      const context = composeContext({
        state: state2,
        template: farcasterReplyMessageTemplate,
      });

      const response = await generateMessageResponse({
        runtime: this.runtime,
        context,
        modelClass: ModelClass.SMALL,
      });

      const callback = async (
        content: any,
        hash?: string,
        fromAction: boolean = false
      ) => {
        console.log("=== CALLBACK CONTENT ===", {
          text: content.text,
          action: content.action,
        });

        const reply = await this.replyToCast(
          content.text,
          hash || payload.data.hash
        );

        if (fromAction) {
          this.hasRespondedInAction.set(payload.data.hash, Date.now());
        }
        console.log("Reply from Farcaster:", {
          id: reply?.id,
          text: reply?.content?.text,
          roomId: reply?.roomId,
        });
        if (reply) {
          const memory = {
            id: reply.id,
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId: reply.roomId,
            content: {
              text: content.text,
              action: content.action,
              fromAction: content.fromAction,
            },
            createdAt: Date.now(),
          };

          console.log("New Memory Created:", {
            id: memory.id,
            text: memory.content.text,
            action: memory.content.action,
            roomId: memory.roomId,
          });
          await this.runtime.messageManager.createMemory(memory);
          return [memory];
        }
        return [];
      };

      if (response?.text) {
        const responseMemory: Memory = {
          id: stringToUuid(response.text),
          userId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          roomId: memory.roomId,
          content: {
            text: response.text,
            action: response?.action,
          },
          createdAt: Date.now(),
        };

        await this.runtime.processActions(
          memory,
          [responseMemory],
          state2,
          callback
        );

        if (this.hasRespondedInAction.has(payload.data.hash)) {
          elizaLogger.log(
            "Ya se respondió en una acción, omitiendo respuesta adicional"
          );
        } else {
          this.cleanupActionResponses();
          await callback(response, undefined, false);
          elizaLogger.success("Respuesta publicada exitosamente");
        }
      }
    } catch (error) {
      elizaLogger.error("Error en handleReply:", error);
      throw error;
    }
  }

  private async replyToCast(text: string, parentHash: string): Promise<any> {
    try {
      const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          signer_uuid: this.config.signerUuid,
          text: text,
          parent: parentHash,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error publicando respuesta: ${JSON.stringify(error)}`);
      }

      const responseData = await response.json();
      elizaLogger.log("Respuesta de Farcaster:", {
        hash: responseData.cast.hash,
        text: responseData.cast.text,
      });

      const memory = {
        id: stringToUuid(responseData.cast.hash + "-" + this.runtime.agentId),
        userId: this.runtime.agentId,
        agentId: this.runtime.agentId,
        content: {
          text,
          source: "farcaster",
          metadata: {
            castHash: responseData.cast.hash,
            parentHash: parentHash,
          },
        },
        roomId: stringToUuid(`farcaster-${parentHash}`),
        createdAt: Date.now(),
      };

      await this.runtime.messageManager.createMemory(memory);
      elizaLogger.log("Memoria creada:", {
        id: memory.id,
        text: memory.content.text,
        castHash: memory.content.metadata.castHash,
        parentHash: memory.content.metadata.parentHash,
      });

      return memory;
    } catch (error) {
      elizaLogger.error("Error publicando respuesta en Farcaster:", error);
      return null;
    }
  }

  private async registerWebhook(webhookUrl: string) {
    try {
      const response = await fetch(
        "https://api.neynar.com/v2/farcaster/webhook",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": this.config.apiKey,
          },
          body: JSON.stringify({
            name: `${this.runtime.character.name}-webhook`,
            url: `${webhookUrl}/webhook/mentions`,
            subscription: {
              "cast.created": {
                mentioned_fids: [this.config.fid],
                parent_author_fids: [this.config.fid],
                exclude_author_fids: [this.config.fid],
                author_fids: [874542],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error registrando webhook: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      this.webhookId = data.webhook.webhook_id;
      elizaLogger.success(`Webhook registrado con ID: ${this.webhookId}`);

      this.webhookSecret = data.webhook.secrets[0]?.value;
    } catch (error) {
      elizaLogger.error("Error registrando webhook de Neynar:", error);
      throw error;
    }
  }

  async start(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await ngrok.kill();

        this.app.listen(this.port, async () => {
          elizaLogger.success(
            `Servidor webhook de Neynar ejecutándose en puerto ${this.port}`
          );

          try {
            await ngrok.authtoken(process.env.NGROK_AUTH_TOKEN);

            this.ngrokUrl = await ngrok.connect({
              addr: this.port,
              authtoken: process.env.NGROK_AUTH_TOKEN,
            });

            await this.registerWebhook(this.ngrokUrl);

            elizaLogger.success(
              `URL del webhook de Neynar: ${this.ngrokUrl}/webhook/mentions`
            );
            resolve();
          } catch (ngrokError) {
            elizaLogger.error("Error iniciando ngrok:", ngrokError);
            reject(ngrokError);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    elizaLogger.log("Deteniendo cliente de Neynar...");

    if (this.webhookId) {
      try {
        elizaLogger.log(`Eliminando webhook ${this.webhookId}...`);
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/webhook/${this.webhookId}`,
          {
            method: "DELETE",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              "x-api-key": this.config.apiKey,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Error eliminando webhook: ${JSON.stringify(error)}`);
        }

        elizaLogger.success("Webhook eliminado exitosamente");
      } catch (error) {
        elizaLogger.error("Error eliminando webhook de Neynar:", error);
      }
    }

    if (this.ngrokUrl) {
      try {
        elizaLogger.log("Desconectando ngrok...");
        await ngrok.disconnect();
        await ngrok.kill();
        this.ngrokUrl = null;
        elizaLogger.success("Ngrok desconectado exitosamente");
      } catch (error) {
        elizaLogger.error("Error desconectando ngrok:", error);
      }
    }
  }
}

export const NeynarClientInterface = {
  start: async (runtime: any) => {
    const requiredEnvVars = [
      "NEYNAR_API_KEY",
      "NEYNAR_AGENT_SIGNER_UUID",
      "NEYNAR_AGENT_FID",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      throw new Error(
        `Faltan variables de entorno requeridas: ${missingEnvVars.join(", ")}`
      );
    }

    const config: NeynarConfig = {
      apiKey: process.env.NEYNAR_API_KEY!,
      signerUuid: process.env.NEYNAR_AGENT_SIGNER_UUID!,
      fid: parseInt(process.env.NEYNAR_AGENT_FID!),
    };

    elizaLogger.log("Iniciando cliente de Neynar");
    const client = new NeynarClient(runtime, config);
    await client.start();
    return client;
  },

  stop: async (client: NeynarClient) => {
    elizaLogger.log("Deteniendo cliente de Neynar");
    await client.stop();
  },
};

export default NeynarClientInterface;
