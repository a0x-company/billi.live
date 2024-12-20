import { WebhookPayload } from '../types';
import { stringToUuid, elizaLogger } from '@ai16z/eliza';

export class MemoryService {
  constructor(private runtime: any) {}

  async checkDuplicateResponse(memories: any[], hash: string): Promise<boolean> {
    elizaLogger.log("📝 Memorias existentes:", JSON.stringify(memories.map(m => m.content), null, 2));
    
    const alreadyResponded = memories.some(
      memory => Array.isArray(memory.content?.responded_mentions) && 
                memory.content.responded_mentions.includes(hash)
    );

    if (alreadyResponded) {
      elizaLogger.log("⚠️ Interacción ya respondida, hash:", hash);
      return true;
    }
    return false;
  }

  async createInteractionMemory(
    payload: WebhookPayload, 
    roomId: string, 
    conversationHistory: any[], 
    conversation: any
  ) {
    const memory = {
      id: stringToUuid(payload.data.hash),
      agentId: this.runtime.agentId,
      userId: stringToUuid(payload.data.author.username),
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

    elizaLogger.debug("💾 Guardando memoria inicial:", JSON.stringify(memory.content, null, 2));
    return this.runtime.messageManager.createMemory(memory);
  }
}