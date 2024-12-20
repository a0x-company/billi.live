import { WebhookPayload } from '../types';

export class ConversationService {
  constructor(private apiKey: string) {}

  async getConversationContext(payload: WebhookPayload) {
    let conversationHistory = [];
    let conversation = null;

    if (payload.data.thread_hash) {
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${payload.data.thread_hash}&type=hash&reply_depth=3&include_chronological_parent_casts=true`,
        {
          headers: {
            accept: "application/json",
            "x-api-key": this.apiKey,
          },
        }
      );

      if (!response.ok) throw new Error("Error obteniendo la conversación");
      
      conversation = await response.json();
      conversationHistory = this.mapRepliesRecursively(conversation.conversation.cast);
    }

    return { conversationHistory, conversation };
  }

  mapRepliesRecursively(cast: any) {
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
      console.log(`\nProcesando ${cast.direct_replies.length} respuestas directas de ${cast.author.username}:`);
      for (const reply of cast.direct_replies) {
        console.log("\n-> Entrando en respuesta de:", reply.author.username);
        const nestedReplies = this.mapRepliesRecursively(reply);
        console.log("<- Saliendo de respuesta, obtuve", nestedReplies.length, "mensajes");
        messages = [...messages, ...nestedReplies];
      }
    }

    return messages;
  }
}