import { EventEmitter } from 'events';
import express from 'express';
import ngrok from 'ngrok';
import { elizaLogger, stringToUuid, generateMessageResponse, ModelClass, messageCompletionFooter, shouldRespondFooter, generateShouldRespond, AgentRuntime } from '@ai16z/eliza';
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
Canal: {{platformContext.channelContext.name}}
Descripción del canal: {{platformContext.channelContext.description}}

# Mensaje Actual
De: {{senderName}} ({{platformContext.authorInfo.displayName}})
Mensaje: {{message}}

# Hilo de Conversación
{{platformContext.conversationHistory}}

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
# About {{agentName}}
{{bio}}
{{adjective}}

# Current Interaction
Type: {{messageType}}
Platform: {{platform}}
Thread Context: {{platformContext.threadContext}}
Is Reply: {{platformContext.isReply}}
Channel: {{platformContext.channelContext.name}}
Channel Description: {{platformContext.channelContext.description}}

# Conversation Context
Recent messages:
{{recentMessages}}

# Message Info
Sender: {{senderName}} ({{senderDisplayName}})
Message: {{message}}
Current Farcaster Username: {{actualUsername}}

# Instructions
Choose whether to respond based on:
1. Is the message appropriate?
2. Does it require a response?
3. Is the tone and content suitable for interaction?

Response options are [RESPOND], [IGNORE] and [STOP].
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
De: {{senderName}} ({{platformContext.authorInfo.displayName}})
Mensaje: {{message}}

# Hilo de Conversación
{{platformContext.conversationHistory}}

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
Estado del hilo: {{platformContext.isThread ? "Conversación en hilo" : "Nueva conversación"}}
Canal: {{platformContext.channelContext.name}}
Tema del canal: {{platformContext.channelContext.description}}
Nivel de engagement: {{characterContext.engagement}}

# Contexto de Conversación
Interacciones previas con este usuario:
{{recentMessageInteractions}}

Contexto del hilo: {{platformContext.threadContext}}
Mensajes recientes:
{{platformContext.conversationHistory}}

# Información del Mensaje
Remitente: {{senderName}} ({{platformContext.authorInfo.displayName}})
Perfil: {{platformContext.authorInfo.username}}
Foto de perfil: {{platformContext.authorInfo.profilePicture}}
Mensaje: {{message}}
Likes en la conversación: {{content.metadata.reactions.likes_count}}
Nombre de usuario actual en Farcaster: {{actualUsername}}

# Estado del Agente
Estado de ánimo actual: {{characterContext.currentMood}}
Estilo de interacción: {{characterContext.interactionStyle}}

# Instrucciones
Decide si responder basado en:
1. ¿Es el mensaje apropiado y seguro para responder?
2. ¿Requiere o merece una respuesta?
3. ¿Es relevante para {{agentName}} y el contexto del canal?
4. ¿El tono y contenido son adecuados para la interacción?
5. ¿Hay suficiente contexto para dar una respuesta significativa?
6. ¿El nivel de engagement ({{characterContext.engagement}}) justifica una respuesta?

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
      elizaLogger.log('Cleaning up before exit...');
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
        elizaLogger.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
}

  private async handleMention(payload: WebhookPayload) {
    try {
        elizaLogger.log('Handling mention from Farcaster...');
        
        // Verificación técnica por FID
        const wasAgentMentioned = payload.data.mentioned_profiles.some(
            profile => profile.fid === this.config.fid
        );
        
        elizaLogger.log(`Agent FID: ${this.config.fid}`);
        elizaLogger.log('Was agent mentioned?', wasAgentMentioned);

        if (!wasAgentMentioned) {
            elizaLogger.log('Agent not mentioned, skipping...');
            return;
        }

        // Obtener el username actual en Farcaster
        const agentProfile = payload.data.mentioned_profiles.find(
            profile => profile.fid === this.config.fid
        );
        
        // Obtener el contexto de la conversación si existe thread_hash
        let conversationHistory = [];
        let reactions = null;
        
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
                const conversation = await conversationResponse.json();
                conversationHistory = [
                    ...(conversation.conversation.chronological_parent_casts || []),
                    conversation.conversation.cast,
                    ...(conversation.conversation.cast.direct_replies || [])
                ].map(cast => ({
                    author: cast.author.display_name || cast.author.username,
                    text: cast.text,
                    timestamp: cast.timestamp
                }));
                reactions = conversation.conversation.cast.reactions;
            }
        }

        const roomId = stringToUuid(`farcaster-${payload.data.hash}`);
        elizaLogger.log('Room ID:', roomId);
        const userId = stringToUuid(payload.data.author.username);
        elizaLogger.log('User ID:', userId);

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
                    mentions: payload.data.mentioned_profiles,
                    embeds: payload.data.embeds,
                    conversationHistory,
                    channel: payload.data.channel,
                    reactions
                }
            },
            createdAt: Date.now()
        };

        elizaLogger.log('Creating memory...');
        await this.runtime.messageManager.createMemory(memory);


        elizaLogger.log('Composing state...');
        const state = await this.runtime.composeState(memory, {
            platform: "farcaster",
            platformContext: {
                isThread: !!payload.data.parent_hash,
                isReply: !!payload.data.parent_hash,
                threadContext: payload.data.thread_hash ? "This is part of a thread discussion" : "This is a new conversation",
                conversationHistory: conversationHistory.map(msg => 
                    `${msg.author}: ${msg.text}`
                ).join('\n'),
                authorInfo: {
                    username: payload.data.author.username,
                    displayName: payload.data.author.display_name,
                    profilePicture: payload.data.author.pfp_url
                }
            },
            messageType: payload.data.parent_hash ? "reply" : "mention",
            characterContext: {
                currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
                interactionStyle: "casual and engaging, keeping responses under 320 characters"
            },
            message: payload.data.text,
            senderName: payload.data.author.username,
            senderDisplayName: payload.data.author.display_name,
            actualUsername: agentProfile?.username || 'unknown',
        });

        console.log('State  1 composed:', state);
        await this.runtime.evaluate(memory, state);

        elizaLogger.log('Composing state...');
        const state2 = await this.runtime.composeState(memory, {
            platform: "farcaster",
            platformContext: {
                isThread: !!payload.data.parent_hash,
                isReply: !!payload.data.parent_hash,
                threadContext: payload.data.thread_hash ? "This is part of a thread discussion" : "This is a new conversation",
                authorInfo: {
                    username: payload.data.author.username,
                    displayName: payload.data.author.display_name,
                    profilePicture: payload.data.author.pfp_url
                }
            },
            messageType: payload.data.parent_hash ? "reply" : "mention",
            characterContext: {
                currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
                interactionStyle: "casual and engaging, keeping responses under 320 characters"
            },
            message: payload.data.text,
            senderName: payload.data.author.username,
            senderDisplayName: payload.data.author.display_name,
            actualUsername: agentProfile?.username || 'unknown',
        });

        elizaLogger.log('Checking if should respond...');
        const shouldRespondContext = composeContext({
            state: state2,
            template: this.runtime.character.templates?.farcasterShouldRespondTemplate || farcasterShouldRespondTemplate
        });

        elizaLogger.log('Should respond context:', shouldRespondContext);

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL
        });

        elizaLogger.log(`Should respond: ${shouldRespond}`);

        if (shouldRespond !== 'RESPOND') {
            elizaLogger.log('Skipping response...');
            return;
        }

        elizaLogger.log('Generating response...');
        const context = composeContext({
            state: state2,
            template: this.runtime.character.templates?.farcasterMessageHandlerTemplate || farcasterMessageTemplate
        });
        console.log('Context:', context);
        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL
        });

        if (response?.text) {
            elizaLogger.log('Posting reply to Farcaster...');
            await this.replyToCast(response.text, payload.data.hash);
            elizaLogger.success('Reply posted successfully');
        } else {
            elizaLogger.error('No response text generated');
        }
    } catch (error) {
        elizaLogger.error('Error in handleMention:', error);
        throw error;
    }
  }

  private async handleReply(payload: WebhookPayload) {
    try {
        elizaLogger.log('Manejando respuesta a un cast del agente...');

        // Obtener el contexto completo de la conversación
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
        
        // Construir un historial cronológico de la conversación
        const conversationHistory = [
            ...(conversation.conversation.chronological_parent_casts || []),
            conversation.conversation.cast,
            ...(conversation.conversation.cast.direct_replies || [])
        ].map(cast => ({
            author: cast.author.display_name || cast.author.username,
            text: cast.text,
            timestamp: cast.timestamp
        }));
        console.log('Conversation history:', conversationHistory);
        const roomId = stringToUuid(`farcaster-${payload.data.thread_hash}`);
        elizaLogger.log('Room ID:', roomId);
        const userId = stringToUuid(payload.data.author.username);
        elizaLogger.log('User ID:', userId);

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

        const state = await this.runtime.composeState(memory, {
            platform: "farcaster",
            platformContext: {
                isThread: true,
                isReply: true,
                threadContext: "Continuando una conversación existente",
                conversationHistory: conversationHistory.map(msg => 
                    `${msg.author}: ${msg.text}`
                ).join('\n'),
                authorInfo: {
                    username: payload.data.author.username,
                    displayName: payload.data.author.display_name,
                    profilePicture: payload.data.author.pfp_url
                },
                channelContext: payload.data.channel ? {
                    name: payload.data.channel.name,
                    description: payload.data.channel.description
                } : undefined
            },
            messageType: "reply",
            characterContext: {
                currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
                interactionStyle: "conversacional y manteniendo respuestas bajo 320 caracteres",
                engagement: conversation.conversation.cast.reactions.likes_count > 5 ? "tema de alto interés" : "conversación normal"
            },
            message: payload.data.text,
            senderName: payload.data.author.username,
            senderDisplayName: payload.data.author.display_name
        });

        await this.runtime.evaluate(memory, state);

        const state2 = await this.runtime.composeState(memory, {
            platform: "farcaster",
            platformContext: {
                isThread: true,
                isReply: true,
                threadContext: "Continuando una conversación existente",
                conversationHistory: conversationHistory.map(msg => 
                    `${msg.author}: ${msg.text}`
                ).join('\n'),
                authorInfo: {
                    username: payload.data.author.username,
                    displayName: payload.data.author.display_name,
                    profilePicture: payload.data.author.pfp_url
                },
                channelContext: payload.data.channel ? {
                    name: payload.data.channel.name,
                    description: payload.data.channel.description
                } : undefined
            },
            messageType: "reply",
            characterContext: {
                currentMood: this.runtime.character.adjectives[Math.floor(Math.random() * this.runtime.character.adjectives.length)],
                interactionStyle: "conversacional y manteniendo respuestas bajo 320 caracteres",
                engagement: conversation.conversation.cast.reactions.likes_count > 5 ? "tema de alto interés" : "conversación normal"
            },
            message: payload.data.text,
            senderName: payload.data.author.username,
            senderDisplayName: payload.data.author.display_name
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
        console.log('Context:', context);
        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL
        });

        if (response?.text) {
            await this.replyToCast(response.text, payload.data.hash);
            elizaLogger.success('Respuesta publicada exitosamente');
        }
    } catch (error) {
        elizaLogger.error('Error en handleReply:', error);
        throw error;
    }
}


  private async replyToCast(text: string, parentHash: string) {
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
        throw new Error(`Error posting reply: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      elizaLogger.error('Error posting reply to Farcaster:', error);
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
        throw new Error(`Error registering webhook: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      this.webhookId = data.webhook.webhook_id;
      elizaLogger.success(`Webhook registered with ID: ${this.webhookId}`);
      
      this.webhookSecret = data.webhook.secrets[0]?.value;
    } catch (error) {
      elizaLogger.error('Error registering Neynar webhook:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await ngrok.kill();
        
        this.app.listen(this.port, async () => {
          elizaLogger.success(`Neynar webhook server running on port ${this.port}`);
          
          try {
            await ngrok.authtoken(process.env.NGROK_AUTH_TOKEN);
            
            this.ngrokUrl = await ngrok.connect({
              addr: this.port,
              authtoken: process.env.NGROK_AUTH_TOKEN
            });

            await this.registerWebhook(this.ngrokUrl);
            
            elizaLogger.success(`Neynar webhook URL: ${this.ngrokUrl}/webhook/mentions`);
            resolve();
          } catch (ngrokError) {
            elizaLogger.error('Error starting ngrok:', ngrokError);
            reject(ngrokError);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    elizaLogger.log('Stopping Neynar client...');
    
    if (this.webhookId) {
      try {
        elizaLogger.log(`Deleting webhook ${this.webhookId}...`);
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
          throw new Error(`Error deleting webhook: ${JSON.stringify(error)}`);
        }

        elizaLogger.success('Webhook deleted successfully');
      } catch (error) {
        elizaLogger.error('Error deleting Neynar webhook:', error);
      }
    }

    if (this.ngrokUrl) {
      try {
        elizaLogger.log('Disconnecting ngrok...');
        await ngrok.disconnect();
        await ngrok.kill();
        this.ngrokUrl = null;
        elizaLogger.success('Ngrok disconnected successfully');
      } catch (error) {
        elizaLogger.error('Error disconnecting ngrok:', error);
      }
    }
  }
}

export const NeynarClientInterface = {
  start: async (runtime: any) => {
    const requiredEnvVars = ['NEYNAR_API_KEY', 'NEYNAR_AGENT_SIGNER_UUID', 'NEYNAR_AGENT_FID'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    const config: NeynarConfig = {
      apiKey: process.env.NEYNAR_API_KEY!,
      signerUuid: process.env.NEYNAR_AGENT_SIGNER_UUID!,
      fid: parseInt(process.env.NEYNAR_AGENT_FID!)
    };

    elizaLogger.log('Starting Neynar client');
    const client = new NeynarClient(runtime, config);
    await client.start();
    return client;
  },

  stop: async (client: NeynarClient) => {
    elizaLogger.log('Stopping Neynar client');
    await client.stop();
  }
};

export default NeynarClientInterface;