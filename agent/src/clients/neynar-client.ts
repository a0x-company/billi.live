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
  }
}

const farcasterMessageTemplate = `
# About {{agentName}}
{{bio}}
{{lore}}
{{topics}}

# Personality Traits
{{adjective}}
Current interests: {{topic}}

# Conversation History
Previous interactions with this user:
{{recentMessageInteractions}}

Recent conversation in this thread:
{{recentMessages}}

# Knowledge Context
{{knowledge}}

# Style Guidelines
{{messageDirections}}
{{postDirections}}

# Example Conversations
{{characterMessageExamples}}

# Instructions
You are {{agentName}} responding to a mention on Farcaster from {{senderName}}.
Keep responses concise (max 320 chars) and maintain your personality.
Include an action if appropriate. {{actionNames}}

Available actions:
{{actions}}
` + messageCompletionFooter;

const farcasterShouldRespondTemplate = `
# About {{agentName}}
{{bio}}
{{adjective}}

# Conversation Context
Previous interactions with this user:
{{recentMessageInteractions}}

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
            await this.handleMention(payload);
          }
        
        res.status(200).json({ status: 'ok' });
      } catch (error) {
        elizaLogger.error('Error processing mention webhook:', error);
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

        const roomId = stringToUuid(`farcaster-${payload.data.hash}`);
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
                    mentions: payload.data.mentioned_profiles,
                    embeds: payload.data.embeds
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

        elizaLogger.log('State composed:', state);

        elizaLogger.log('Checking if should respond...');
        const shouldRespondContext = composeContext({
            state,
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
            state,
            template: this.runtime.character.templates?.farcasterMessageHandlerTemplate || farcasterMessageTemplate
        });

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
          name: `${this.runtime.character.name}-mentions-webhook`,
          url: `${webhookUrl}/webhook/mentions`,
          subscription: {
            "cast.created": {
              "mentioned_fids": [this.config.fid],
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