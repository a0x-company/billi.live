import { EventEmitter } from "events";
import express, { Request, Response } from "express";
import ngrok from "ngrok";
import {
  elizaLogger,
  stringToUuid,
  AgentRuntime,
  Memory,
} from "@ai16z/eliza";
import dotenv from "dotenv";
import { NeynarConfig, WebhookCache, WebhookPayload } from "./types.ts";
import { NEYNAR_CONFIG } from "./config.ts";
import { farcasterMessageTemplate, farcasterReplyMessageTemplate, farcasterShouldRespondTemplate, farcasterShouldRespondToReplyTemplate } from "./templates.ts";
import { ConversationService } from "./services/conversation.ts";
import { MemoryService } from "./services/memory.ts";
import { ResponseService } from "./services/response.ts";
import { StateService } from "./services/state.ts";

dotenv.config();

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
  private WEBHOOK_CACHE_TIMEOUT = NEYNAR_CONFIG.WEBHOOK_CACHE_TIMEOUT;
  private ACTION_RESPONSE_TIMEOUT = NEYNAR_CONFIG.ACTION_RESPONSE_TIMEOUT;

  private conversationService: ConversationService;
  private memoryService: MemoryService;
  private responseService: ResponseService;
  private stateService: StateService;

  constructor(runtime: any, config: NeynarConfig, port: number = NEYNAR_CONFIG.DEFAULT_PORT) {
    super();
    this.runtime = runtime;
    this.config = config;
    this.port = port;
    this.app = express()

    this.conversationService = new ConversationService(config.apiKey);
    this.memoryService = new MemoryService(runtime);
    this.responseService = new ResponseService(runtime);
    this.stateService = new StateService(runtime);

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

  private async handleInteraction(payload: WebhookPayload, type: 'mention' | 'reply') {
    try {
      elizaLogger.log(`Manejando ${type} de Farcaster...`);
  
      const roomId = stringToUuid(`farcaster-${payload.data.hash}`);
      const existingMemories = await this.runtime.messageManager.getMemories({ roomId });
  
      if (await this.memoryService.checkDuplicateResponse(existingMemories, payload.data.hash)) {
        return;
      }
  
      const { conversationHistory, conversation } = await this.conversationService.getConversationContext(payload);
      const agentProfile = type === 'mention' ? 
        payload.data.mentioned_profiles.find(profile => profile.fid === this.config.fid) : 
        null;
  
      const memory = await this.memoryService.createInteractionMemory(
        payload, 
        roomId, 
        conversationHistory, 
        conversation
      );
  
      const state = await this.stateService.createState(
        memory,
        payload,
        conversationHistory,
        conversation,
        type,
        agentProfile
      );
  
      const shouldRespond = await this.responseService.shouldRespond(state, type);
      if (!shouldRespond) {
        elizaLogger.log(`Decidió no responder a este ${type}`);
        return;
      }
  
      await this.runtime.evaluate(memory, state);
  
      const state2 = await this.stateService.createState(
        memory,
        payload,
        conversationHistory,
        conversation,
        type,
        agentProfile
      );
  
      const parsedResponse = await this.responseService.generateResponseWithRetries(state2, type);
      if (!parsedResponse) return;
  
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
  
      const responseCallback = await this.responseService.createResponseCallback(
        this.hasRespondedInAction,
        async (text: string, hash?: string) => await this.replyToCast(text, hash || payload.data.hash)
      );
  
      await this.runtime.processActions(memory, [responseMemory], state2, responseCallback);
  
      if (this.hasRespondedInAction.has(payload.data.hash)) {
        elizaLogger.log("Ya se respondió en una acción, omitiendo respuesta adicional");
      } else {
        this.cleanupActionResponses();
        await responseCallback(parsedResponse, undefined, false);
        elizaLogger.success("Respuesta publicada exitosamente");
      }
  
    } catch (error) {
      elizaLogger.error(`Error en handle${type}:`, error);
      throw error;
    }
  } 

  private async handleMention(payload: WebhookPayload) {
    return this.handleInteraction(payload, 'mention');
  }
  
  private async handleReply(payload: WebhookPayload) {
    return this.handleInteraction(payload, 'reply');
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
    elizaLogger.log("Iniciando cliente de Neynar");

    const config: NeynarConfig = {
      apiKey: NEYNAR_CONFIG.CREDENTIALS.API_KEY,
      signerUuid: NEYNAR_CONFIG.CREDENTIALS.SIGNER_UUID,
      fid: NEYNAR_CONFIG.CREDENTIALS.FID,
    };

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
