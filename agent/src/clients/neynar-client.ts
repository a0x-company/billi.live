import { EventEmitter } from 'events';
import express from 'express';
import ngrok from 'ngrok';
import { elizaLogger, stringToUuid, generateMessageResponse, ModelClass, messageCompletionFooter, shouldRespondFooter, generateShouldRespond, AgentRuntime, Memory, Action } from '@ai16z/eliza';
import { composeContext } from '@ai16z/eliza';
import dotenv from 'dotenv';

dotenv.config();

interface NeynarConfig {
  apiKey: string;
  signerUuid: string;
  fid: number;
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
  }
}

const farcasterMessageTemplate = `
# Sobre {{agentName}}
{{bio}}
{{lore}}
{{topics}}

# Rasgos de Personalidad
{{adjective}}
Intereses actuales: {{topic}}

# Contexto de la Mención
Plataforma: {{platform}}
Tipo: {{messageType}}
Canal: {{channelName}}
Descripción del canal: {{channelDescription}}

# Mensaje Actual
De: {{senderName}} ({{authorDisplayName}})
Mensaje: {{message}}

# Hilo de Conversación
{{conversationHistory}}

# Contexto de Conocimiento
{{knowledge}}

# Guías de Estilo
{{messageDirections}}
{{postDirections}}

# Ejemplos de Conversaciones
{{characterMessageExamples}}

# Instrucciones
Eres {{agentName}} respondiendo a una mención en Farcaster de {{senderName}}.
Mantén las respuestas concisas (máx 320 caracteres) y conserva tu personalidad.
Incluye una acción si es apropiado. {{actionNames}}

Acciones disponibles:
{{actions}}
` + messageCompletionFooter;

const farcasterShouldRespondTemplate = `
# Sobre {{agentName}}
{{bio}}
{{adjective}}

# Contexto Actual
Tipo: {{messageType}}
Plataforma: {{platform}}
Estado del hilo: {{threadContext}}
Es respuesta: {{isReply}}
Canal: {{channelName}}
Descripción del canal: {{channelDescription}}

# Contexto de Conversación
Mensajes recientes:
{{recentMessages}}

# Información del Mensaje
Remitente: {{senderName}} ({{authorDisplayName}})
Mensaje: {{message}}
Usuario actual en Farcaster: {{actualUsername}}

# Instrucciones
Decide si responder basado en:
1. ¿Es el mensaje apropiado?
2. ¿Requiere una respuesta?
3. ¿El tono y contenido son adecuados para la interacción?

Las opciones de respuesta son [RESPOND], [IGNORE] y [STOP].
` + shouldRespondFooter;

const farcasterReplyMessageTemplate = `
# Sobre {{agentName}}
{{bio}}
{{lore}}
{{topics}}

# Rasgos de Personalidad
{{adjective}}
Intereses actuales: {{topic}}

# Mensaje Actual
De: {{senderName}} ({{authorDisplayName}})
Mensaje: {{message}}

# Hilo de Conversación
{{conversationHistory}}

# Contexto de Conocimiento
{{knowledge}}

# Guías de Estilo
{{messageDirections}}
{{postDirections}}

# Ejemplos de Conversaciones
{{characterMessageExamples}}

# Instrucciones
Eres {{agentName}} respondiendo a una respuesta en Farcaster de {{senderName}}.
Mantén las respuestas concisas (máx 320 caracteres) y conserva tu personalidad.
Incluye una acción si es apropiado. {{actionNames}}

Acciones disponibles:
{{actions}}
` + messageCompletionFooter;

const farcasterShouldRespondToReplyTemplate = `
# Sobre {{agentName}}
{{bio}}
{{adjective}}

# Contexto de la Plataforma
Plataforma: {{platform}}
Tipo: {{messageType}}
Estado del hilo: {{isThread}}
Canal: {{channelName}}
Tema del canal: {{channelDescription}}
Nivel de engagement: {{engagement}}

# Contexto de Conversación
Interacciones previas con este usuario: {{recentMessageInteractions}}
Contexto del hilo: {{threadContext}}
Mensajes recientes: {{conversationHistory}}

# Información del Mensaje
Remitente: {{senderName}} ({{authorDisplayName}})
Perfil: {{authorUsername}}
Foto de perfil: {{authorProfilePicture}}
Mensaje: {{message}}
Likes en la conversación: {{likesCount}}
Usuario actual en Farcaster: {{actualUsername}}

# Estado del Agente
Estado de ánimo actual: {{currentMood}}
Estilo de interacción: {{interactionStyle}}

# Instrucciones
Decide si responder basado en:
1. ¿Es el mensaje apropiado y seguro para responder?
2. ¿Requiere o merece una respuesta?
3. ¿Es relevante para {{agentName}} y el contexto del canal?
4. ¿El tono y contenido son adecuados para la interacción?
5. ¿Hay suficiente contexto para dar una respuesta significativa?
6. ¿El nivel de engagement ({{engagement}}) justifica una respuesta?

Opciones de respuesta son:
[RESPOND] - Si el mensaje merece engagement
[IGNORE] - Si el mensaje no requiere respuesta
[STOP] - Si el mensaje es inapropiado o inseguro
` + shouldRespondFooter;

export class NeynarClient extends EventEmitter {
  private app: express.Application;
  private port: number;
  private ngrokUrl: string | null = null;
  private runtime: AgentRuntime;
  private config: NeynarConfig;
  private webhookId: string | null = null;
  private webhookSecret: string | null = null;
  private hasRespondedMention: Map<string, boolean> = new Map();

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

  private setupSignalHandlers() {
    const cleanup = async () => {
      elizaLogger.log('Limpiando antes de salir...');
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupWebhookEndpoint() {
    this.app.post('/webhook/mentions', async (req, res) => {
      try {
        const payload = req.body as WebhookPayload;
        
        if (payload.type === 'cast.created') {  
          if (payload.data.mentioned_profiles.some(profile => profile.fid === this.config.fid)) {
            await this.handleMention(payload);
          } else if (payload.data.parent_author?.fid === this.config.fid) {
            await this.handleReply(payload);
          }
        }
        
        res.status(200).json({ status: 'ok' });
      } catch (error) {
        elizaLogger.error('Error procesando webhook:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });
  }

  private async handleMention(payload: WebhookPayload) {
    try {
        elizaLogger.log('Manejando mención de Farcaster...');
        
        // Verificar menciones duplicadas
        const roomId = stringToUuid(`farcaster-${payload.data.hash}`);
        const mentionMemories = await this.runtime.messageManager.getMemories({
            roomId: roomId,
            agentId: this.runtime.agentId
        });

        elizaLogger.log('🔍 Verificando menciones en roomId:', roomId);
        elizaLogger.log('📝 Memorias existentes:', JSON.stringify(mentionMemories.map(m => m.content), null, 2));

        const alreadyResponded = mentionMemories.some(memory => 
          Array.isArray(memory.content?.responded_mentions) && 
          memory.content.responded_mentions.includes(payload.data.hash)
      );

        if (alreadyResponded) {
            elizaLogger.log('⚠️ Mención ya respondida, hash:', payload.data.hash);
            return;
        }
        
        const wasAgentMentioned = payload.data.mentioned_profiles.some(
            profile => profile.fid === this.config.fid
        );
        
        if (!wasAgentMentioned) {
            elizaLogger.log('Agente no mencionado, omitiendo...');
            return;
        }

        const agentProfile = payload.data.mentioned_profiles.find(
            profile => profile.fid === this.config.fid
        );
        
        let conversationHistory = [];
        let conversation = null;
        
        if (payload.data.thread_hash) {
            const conversationResponse = await fetch(
                `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${payload.data.thread_hash}&type=hash&reply_depth=3&include_chronological_parent_casts=true`,
                {
                    headers: {
                        'accept': 'application/json',
                        'x-api-key': this.config.apiKey
                    }
                }
            );

            if (conversationResponse.ok) {
                conversation = await conversationResponse.json();
                conversationHistory = [
                    ...(conversation.conversation.chronological_parent_casts || []),
                    conversation.conversation.cast,
                    ...(conversation.conversation.cast.direct_replies || [])
                ].map(cast => ({
                    author: cast.author.display_name || cast.author.username,
                    text: cast.text,
                    timestamp: cast.timestamp
                }));
            }
        }

        const userId = stringToUuid(payload.data.author.username);

        const memory = {
            id: stringToUuid(payload.data.hash),
            agentId: this.runtime.agentId,
            userId,
            roomId,
            content: {
                text: payload.data.text,
                source: 'farcaster',
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
                    reactions: conversation?.conversation?.cast?.reactions
                }
            },
            createdAt: Date.now()
        };

        elizaLogger.debug('💾 Guardando memoria inicial:', JSON.stringify(memory.content, null, 2));
        await this.runtime.messageManager.createMemory(memory);

        const state = await this.runtime.composeState(memory, {
            platform: "farcaster",
            messageType: payload.data.parent_hash ? "reply" : "mention",
            isThread: !!payload.data.parent_hash,
            isReply: !!payload.data.parent_hash,
            threadContext: payload.data.thread_hash ? "Continuando una conversación existente" : "Nueva conversación",
            conversationHistory: conversationHistory.map(msg => 
                `${msg.author}: ${msg.text}`
            ).join('\n'),
            channelName: payload.data.channel?.name || '',
            channelDescription: payload.data.channel?.description || '',
            authorUsername: payload.data.author.username,
            authorDisplayName: payload.data.author.display_name,
            authorProfilePicture: payload.data.author.pfp_url,
            message: payload.data.text,
            senderName: payload.data.author.username,
            currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
            interactionStyle: "conversacional y manteniendo respuestas bajo 320 caracteres",
            actualUsername: agentProfile?.username || 'unknown'
        });

        await this.runtime.evaluate(memory, state);

        const state2 = await this.runtime.composeState(memory, {
            platform: "farcaster",
            messageType: payload.data.parent_hash ? "reply" : "mention",
            isThread: !!payload.data.parent_hash,
            isReply: !!payload.data.parent_hash,
            threadContext: payload.data.thread_hash ? "Continuando una conversación existente" : "Nueva conversación",
            conversationHistory: conversationHistory.map(msg => 
                `${msg.author}: ${msg.text}`
            ).join('\n'),
            channelName: payload.data.channel?.name || '',
            channelDescription: payload.data.channel?.description || '',
            authorUsername: payload.data.author.username,
            authorDisplayName: payload.data.author.display_name,
            authorProfilePicture: payload.data.author.pfp_url,
            message: payload.data.text,
            senderName: payload.data.author.username,
            currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
            interactionStyle: "conversacional y manteniendo respuestas bajo 320 caracteres",
            actualUsername: agentProfile?.username || 'unknown'
        });

        const shouldRespondContext = composeContext({
            state: state2,
            template: this.runtime.character.templates?.farcasterShouldRespondTemplate || farcasterShouldRespondTemplate
        });

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL
        });

        if (shouldRespond !== 'RESPOND') {
            elizaLogger.log('Omitiendo respuesta...');
            return;
        }

        const context = composeContext({
            state: state2,
            template: this.runtime.character.templates?.farcasterMessageHandlerTemplate || farcasterMessageTemplate
        });
        console.log('=== CONTEXT ===', context);
        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL
        });

        const callback = async (content: any) => {
          console.log('=== CALLBACK CONTENT ===', {
            text: content.text,
            action: content.action
          });
          
          const reply = await this.replyToCast(content.text, payload.data.hash);
          
          console.log('Reply from Farcaster:', {
            id: reply?.id,
            text: reply?.content?.text,
            roomId: reply?.roomId
          });
          this.hasRespondedMention.set(payload.data.hash, true);
          if (reply) {
              const memory = {
                  id: reply.id,
                  userId: this.runtime.agentId,
                  agentId: this.runtime.agentId,
                  roomId: reply.roomId,
                  content: {
                      text: content.text,
                      action: content.action,
                  },
                  createdAt: Date.now()
              };
              
              console.log('New Memory Created:', {
                id: memory.id,
                text: memory.content.text,
                action: memory.content.action,
                roomId: memory.roomId
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
                action: response?.action
            },
            createdAt: Date.now()
        };
    
        await this.runtime.processActions(
            memory,
            [responseMemory], 
            state2,
            callback
        );
    
        if (!this.hasRespondedMention.has(payload.data.hash)) {
          await callback(response);
          elizaLogger.success('Respuesta publicada exitosamente');
      }
    }
    } catch (error) {
        elizaLogger.error('Error en handleMention:', error);
        throw error;
    }
}

private async handleReply(payload: WebhookPayload) {
    try {
        elizaLogger.log('Manejando respuesta a un cast del agente...');

        const conversationResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${payload.data.thread_hash}&type=hash&reply_depth=3&include_chronological_parent_casts=true`,
            {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': this.config.apiKey
                }
            }
        );

        if (!conversationResponse.ok) {
            throw new Error('Error obteniendo la conversación');
        }

        const conversation = await conversationResponse.json();
        
        const conversationHistory = [
            ...(conversation.conversation.chronological_parent_casts || []),
            conversation.conversation.cast,
            ...(conversation.conversation.cast.direct_replies || [])
        ].map(cast => ({
            author: cast.author.display_name || cast.author.username,
            text: cast.text,
            timestamp: cast.timestamp
        }));

        const roomId = stringToUuid(`farcaster-${payload.data.thread_hash}`);
        const userId = stringToUuid(payload.data.author.username);

        const memory = {
            id: stringToUuid(payload.data.hash),
            agentId: this.runtime.agentId,
            userId,
            roomId,
            content: {
                text: payload.data.text,
                source: 'farcaster',
                metadata: {
                    castHash: payload.data.hash,
                    threadHash: payload.data.thread_hash,
                    parentHash: payload.data.parent_hash,
                    author: payload.data.author,
                    conversationHistory,
                    channel: payload.data.channel,
                    reactions: conversation.conversation.cast.reactions
                }
            },
            createdAt: Date.now()
        };

        await this.runtime.messageManager.createMemory(memory);

        // Primer estado para evaluación inicial
        const state = await this.runtime.composeState(memory, {
            platform: "farcaster",
            messageType: "reply",
            isThread: true,
            isReply: true,
            threadContext: "Continuando una conversación existente",
            conversationHistory: conversationHistory.map(msg => 
                `${msg.author}: ${msg.text}`
            ).join('\n'),
            channelName: payload.data.channel?.name || '',
            channelDescription: payload.data.channel?.description || '',
            authorUsername: payload.data.author.username,
            authorDisplayName: payload.data.author.display_name,
            authorProfilePicture: payload.data.author.pfp_url,
            message: payload.data.text,
            senderName: payload.data.author.username,
            currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
            interactionStyle: "conversacional y manteniendo respuestas bajo 320 caracteres",
            engagement: conversation.conversation.cast.reactions.likes_count > 5 ? "tema de alto interés" : "conversación normal",
            likesCount: conversation.conversation.cast.reactions.likes_count || 0,
            actualUsername: payload.data.author.username
        });

        // Primera evaluación para actualizar la personalidad
        await this.runtime.evaluate(memory, state);

        // Segundo estado para la respuesta
        const state2 = await this.runtime.composeState(memory, {
            platform: "farcaster",
            messageType: "reply",
            isThread: true,
            isReply: true,
            threadContext: "Continuando una conversación existente",
            conversationHistory: conversationHistory.map(msg => 
                `${msg.author}: ${msg.text}`
            ).join('\n'),
            channelName: payload.data.channel?.name || '',
            channelDescription: payload.data.channel?.description || '',
            authorUsername: payload.data.author.username,
            authorDisplayName: payload.data.author.display_name,
            authorProfilePicture: payload.data.author.pfp_url,
            message: payload.data.text,
            senderName: payload.data.author.username,
            currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
            interactionStyle: "conversacional y manteniendo respuestas bajo 320 caracteres",
            engagement: conversation.conversation.cast.reactions.likes_count > 5 ? "tema de alto interés" : "conversación normal",
            likesCount: conversation.conversation.cast.reactions.likes_count || 0,
            actualUsername: payload.data.author.username
        });

        const shouldRespondContext = composeContext({
            state: state2,
            template: farcasterShouldRespondToReplyTemplate
        });

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL
        });

        if (shouldRespond !== 'RESPOND') {
            elizaLogger.log('Omitiendo respuesta al reply...');
            return;
        }

        const context = composeContext({
            state: state2,
            template: farcasterReplyMessageTemplate
        });

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL
        });


        const callback = async (content: any) => {
          const reply = await this.replyToCast(content.text, payload.data.hash);
          return reply ? [reply] : [];
      };


        if (response?.text) {
            const responseMemories = await callback(response);
            elizaLogger.success('Respuesta publicada exitosamente');
            
            // Procesar acciones después de enviar la respuesta
            if (responseMemories.length > 0) {
                await this.runtime.processActions(
                    memory,
                    responseMemories,
                    state2,
                    callback
                );
            }
        }
    } catch (error) {
        elizaLogger.error('Error en handleReply:', error);
        throw error;
    }
}

private async replyToCast(text: string, parentHash: string): Promise<any> {
  try {
      const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
          method: 'POST',
          headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'x-api-key': this.config.apiKey
          },
          body: JSON.stringify({
              signer_uuid: this.config.signerUuid,
              text: text,
              parent: parentHash
          })
      });

      if (!response.ok) {
          const error = await response.json();
          throw new Error(`Error publicando respuesta: ${JSON.stringify(error)}`);
      }

      const responseData = await response.json();
      elizaLogger.log('Respuesta de Farcaster:', {
          hash: responseData.cast.hash,
          text: responseData.cast.text
      });
      
      const memory = {
          id: stringToUuid(responseData.cast.hash + "-" + this.runtime.agentId),
          userId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          content: {
              text,
              source: 'farcaster',
              metadata: {
                  castHash: responseData.cast.hash,
                  parentHash: parentHash
              }
          },
          roomId: stringToUuid(`farcaster-${parentHash}`),
          createdAt: Date.now()
      };

      await this.runtime.messageManager.createMemory(memory);
      elizaLogger.log('Memoria creada:', {
          id: memory.id,
          text: memory.content.text,
          castHash: memory.content.metadata.castHash,
          parentHash: memory.content.metadata.parentHash
      });

      return memory;

  } catch (error) {
      elizaLogger.error('Error publicando respuesta en Farcaster:', error);
      return null;
  }
}

  private async registerWebhook(webhookUrl: string) {
    try {
      const response = await fetch('https://api.neynar.com/v2/farcaster/webhook', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.config.apiKey
        },
        body: JSON.stringify({
          name: `${this.runtime.character.name}-webhook`,
          url: `${webhookUrl}/webhook/mentions`,
          subscription: {
            "cast.created": {
              "mentioned_fids": [this.config.fid],
              "parent_author_fids": [this.config.fid],
              "exclude_author_fids": [this.config.fid]
            }
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error registrando webhook: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      this.webhookId = data.webhook.webhook_id;
      elizaLogger.success(`Webhook registrado con ID: ${this.webhookId}`);
      
      this.webhookSecret = data.webhook.secrets[0]?.value;
    } catch (error) {
      elizaLogger.error('Error registrando webhook de Neynar:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await ngrok.kill();
        
        this.app.listen(this.port, async () => {
          elizaLogger.success(`Servidor webhook de Neynar ejecutándose en puerto ${this.port}`);
          
          try {
            await ngrok.authtoken(process.env.NGROK_AUTH_TOKEN);
            
            this.ngrokUrl = await ngrok.connect({
              addr: this.port,
              authtoken: process.env.NGROK_AUTH_TOKEN
            });

            await this.registerWebhook(this.ngrokUrl);
            
            elizaLogger.success(`URL del webhook de Neynar: ${this.ngrokUrl}/webhook/mentions`);
            resolve();
          } catch (ngrokError) {
            elizaLogger.error('Error iniciando ngrok:', ngrokError);
            reject(ngrokError);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    elizaLogger.log('Deteniendo cliente de Neynar...');
    
    if (this.webhookId) {
      try {
        elizaLogger.log(`Eliminando webhook ${this.webhookId}...`);
        const response = await fetch(`https://api.neynar.com/v2/farcaster/webhook/${this.webhookId}`, {
          method: 'DELETE',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.config.apiKey
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Error eliminando webhook: ${JSON.stringify(error)}`);
        }

        elizaLogger.success('Webhook eliminado exitosamente');
      } catch (error) {
        elizaLogger.error('Error eliminando webhook de Neynar:', error);
      }
    }

    if (this.ngrokUrl) {
      try {
        elizaLogger.log('Desconectando ngrok...');
        await ngrok.disconnect();
        await ngrok.kill();
        this.ngrokUrl = null;
        elizaLogger.success('Ngrok desconectado exitosamente');
      } catch (error) {
        elizaLogger.error('Error desconectando ngrok:', error);
      }
    }
  }
}

export const NeynarClientInterface = {
  start: async (runtime: any) => {
    const requiredEnvVars = ['NEYNAR_API_KEY', 'NEYNAR_AGENT_SIGNER_UUID', 'NEYNAR_AGENT_FID'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Faltan variables de entorno requeridas: ${missingEnvVars.join(', ')}`);
    }

    const config: NeynarConfig = {
      apiKey: process.env.NEYNAR_API_KEY!,
      signerUuid: process.env.NEYNAR_AGENT_SIGNER_UUID!,
      fid: parseInt(process.env.NEYNAR_AGENT_FID!)
    };

    elizaLogger.log('Iniciando cliente de Neynar');
    const client = new NeynarClient(runtime, config);
    await client.start();
    return client;
  },

  stop: async (client: NeynarClient) => {
    elizaLogger.log('Deteniendo cliente de Neynar');
    await client.stop();
  }
};

export default NeynarClientInterface;