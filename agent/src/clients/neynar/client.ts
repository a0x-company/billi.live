import { EventEmitter } from "events";
import express, { Request, Response } from "express";
import ngrok from "ngrok";
import {
  elizaLogger,
  stringToUuid,
  generateMessageResponse,
  ModelClass,
  generateShouldRespond,
  AgentRuntime,
  Memory,
} from "@ai16z/eliza";
import { composeContext } from "@ai16z/eliza";
import dotenv from "dotenv";
import { parseAndCleanResponse } from "./utils.ts";
import { NeynarConfig, WebhookCache, WebhookPayload } from "./types.ts";
import {
  farcasterMessageTemplate,
  farcasterReplyMessageTemplate,
  farcasterShouldRespondTemplate,
  farcasterShouldRespondToReplyTemplate,
} from "../constants/templates.ts";
import { NEYNAR_CONFIG } from "./config.ts";
import { WebhookHandler } from "./webhookhandler.ts";
import { ConversationManager } from "./conversationmanager.ts";

dotenv.config();

export class NeynarClient extends EventEmitter {
  private app: express.Application;
  private port: number;
  private ngrokUrl: string | null = null;
  private runtime: AgentRuntime;
  private config: NeynarConfig;
  private webhookId: string | null = null;
  private hasRespondedInAction: Map<string, number> = new Map();
  private WEBHOOK_CACHE_TIMEOUT = NEYNAR_CONFIG.WEBHOOK_CACHE_TIMEOUT;
  private ACTION_RESPONSE_TIMEOUT = NEYNAR_CONFIG.ACTION_RESPONSE_TIMEOUT;
  private webhookHandler: WebhookHandler;
  private conversationManager: ConversationManager;

  constructor(
    runtime: any,
    config: NeynarConfig,
    port: number = NEYNAR_CONFIG.DEFAULT_PORT
  ) {
    super();
    this.runtime = runtime;
    this.config = config;
    this.port = port;
    this.app = express();
    this.webhookHandler = new WebhookHandler();
    this.conversationManager = new ConversationManager(config.apiKey);
    this.setupMiddleware();
    this.setupWebhookEndpoint();
    this.setupSignalHandlers();
  }

  private cleanupActionResponses() {
    const now = Date.now();
    this.hasRespondedInAction.forEach((timestamp, hash) => {
      if (now - timestamp > this.ACTION_RESPONSE_TIMEOUT) {
        this.hasRespondedInAction.delete(hash);
      }
    });
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

        if (this.webhookHandler.isDuplicateWebhook(payload)) {
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
        conversation = await this.conversationManager.getConversationHistory(
          payload.data.thread_hash
        );
        conversationHistory = this.conversationManager.mapRepliesRecursively(
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

      elizaLogger.log("=== SHOULD RESPOND ===", shouldRespond);

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

      // Nuevo sistema de reintentos para la respuesta
      let attempts = 0;
      let parsedResponse = null;
      let response = null;

      while (attempts < 3 && !parsedResponse) {
        const attemptContext =
          attempts > 0
            ? context +
              `\n\nNOTA: Intento ${
                attempts + 1
              }/3. La respuesta anterior no tenía el formato JSON correcto. Asegúrate de responder con el formato:\n\`\`\`json\n{ "user": "{{agentName}}", "text": "tu mensaje", "action": "ACCIÓN_OPCIONAL , NONE si no detectas accion" }\n\`\`\``
            : context;

        elizaLogger.log(`Intento ${attempts + 1} de generar respuesta...`);

        response = await generateMessageResponse({
          runtime: this.runtime,
          context: attemptContext,
          modelClass: ModelClass.SMALL,
        });

        parsedResponse = await parseAndCleanResponse(
          response?.text || "",
          attempts
        );
        attempts++;
      }

      if (!parsedResponse?.text) {
        elizaLogger.error(
          "No se pudo generar una respuesta válida después de 3 intentos"
        );
        return;
      }

      const responseMemory: Memory = {
        id: stringToUuid(parsedResponse.text),
        userId: this.runtime.agentId,
        agentId: this.runtime.agentId,
        roomId: memory.roomId,
        content: {
          text: parsedResponse.text,
          action: parsedResponse.action,
        },
        createdAt: Date.now(),
      };

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

          elizaLogger.log("Nueva memoria creada:", {
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
        await callback(parsedResponse, undefined, false);
        elizaLogger.success("Respuesta publicada exitosamente");
      }
    } catch (error) {
      elizaLogger.error("Error en handleMention:", error);
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

      // Nuevo sistema de reintentos para la respuesta
      let attempts = 0;
      let parsedResponse = null;
      let response = null;

      while (attempts < 3 && !parsedResponse) {
        const attemptContext =
          attempts > 0
            ? context +
              `\n\nNOTA: Intento ${
                attempts + 1
              }/3. La respuesta anterior no tenía el formato JSON correcto. Asegúrate de responder con el formato:\n\`\`\`json\n{ "user": "{{agentName}}", "text": "tu mensaje", "action": "ACCIÓN_OPCIONAL" }\n\`\`\``
            : context;

        elizaLogger.log(`Intento ${attempts + 1} de generar respuesta...`);

        response = await generateMessageResponse({
          runtime: this.runtime,
          context: attemptContext,
          modelClass: ModelClass.SMALL,
        });

        parsedResponse = await parseAndCleanResponse(
          response?.text || "",
          attempts
        );
        attempts++;
      }

      if (!parsedResponse?.text) {
        elizaLogger.error(
          "No se pudo generar una respuesta válida después de 3 intentos"
        );
        return;
      }

      const responseMemory: Memory = {
        id: stringToUuid(parsedResponse.text),
        userId: this.runtime.agentId,
        agentId: this.runtime.agentId,
        roomId: memory.roomId,
        content: {
          text: parsedResponse.text,
          action: parsedResponse.action,
        },
        createdAt: Date.now(),
      };

      const callback = async (
        content: any,
        hash?: string,
        fromAction: boolean = false
      ) => {
        elizaLogger.log("=== CALLBACK CONTENT ===", {
          text: content.text,
          action: content.action,
          fromAction: fromAction,
        });

        const reply = await this.replyToCast(
          content.text,
          hash || payload.data.hash
        );

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

          elizaLogger.log("Nueva memoria creada:", {
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
        await callback(parsedResponse, undefined, false);
        elizaLogger.success("Respuesta publicada exitosamente");
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
              domain: process.env.NGROK_DOMAIN,
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
