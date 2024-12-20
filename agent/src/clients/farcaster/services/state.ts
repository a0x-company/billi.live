import { WebhookPayload, Memory } from '../types';
import { composeContext } from '@ai16z/eliza';

export class StateService {
  constructor(private runtime: any) {}

  async createState(
    memory: Memory,
    payload: WebhookPayload,
    conversationHistory: any[],
    conversation: any,
    type: 'mention' | 'reply',
    agentProfile?: any
  ) {
    // En lugar de crear el estado manualmente, usamos composeState como antes
    return this.runtime.composeState(memory, {
      platform: "farcaster",
      messageType: type === 'mention' ? (payload.data.parent_hash ? "reply" : "mention") : "reply",
      isThread: type === 'mention' ? !!payload.data.parent_hash : true,
      isReply: type === 'mention' ? !!payload.data.parent_hash : true,
      threadContext: payload.data.thread_hash ? "Continuando una conversación existente" : "Nueva conversación",
      conversationHistory: conversationHistory.map((msg) => `${msg.author}: ${msg.text}`).join("\n"),
      channelName: payload.data.channel?.name || "",
      channelDescription: payload.data.channel?.description || "",
      authorUsername: payload.data.author.username,
      authorDisplayName: payload.data.author.display_name,
      authorProfilePicture: payload.data.author.pfp_url,
      message: payload.data.text,
      senderName: payload.data.author.username,
      currentMood: this.runtime.character.adjectives[
        Math.floor(Math.random() * this.runtime.character.adjectives.length)
      ],
      interactionStyle: "conversacional y manteniendo respuestas bajo 320 caracteres",
      ...(type === 'mention' 
        ? { actualUsername: agentProfile?.username || "unknown" }
        : {
            engagement: conversation?.conversation?.cast?.reactions?.likes_count > 5 
              ? "tema de alto interés" 
              : "conversación normal",
            likesCount: conversation?.conversation?.cast?.reactions?.likes_count || 0,
            actualUsername: payload.data.author.username,
          }
      )
    });
  }
}