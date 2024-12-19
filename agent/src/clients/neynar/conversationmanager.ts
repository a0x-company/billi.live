import { elizaLogger } from "@ai16z/eliza";
import { ConversationMessage } from "./types.ts";
import { NEYNAR_CONFIG } from "../config/neynar.config.ts";
import { formatConversationHistory } from "./utils.ts";

export class ConversationManager {
  constructor(private apiKey: string) {}

  /**
   * Obtiene el historial de una conversación por su hash
   */
  public async getConversationHistory(threadHash: string) {
    try {
      elizaLogger.log(`Obteniendo conversación para thread: ${threadHash}`);

      const response = await fetch(
        `${NEYNAR_CONFIG.API_ENDPOINTS.CONVERSATION}?identifier=${threadHash}&type=hash&reply_depth=3&include_chronological_parent_casts=true`,
        {
          headers: {
            accept: "application/json",
            "x-api-key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error al obtener conversación: ${response.statusText}`
        );
      }

      const data = await response.json();
      elizaLogger.log(`Conversación obtenida exitosamente`);
      return data;
    } catch (error) {
      elizaLogger.error("Error en getConversationHistory:", error);
      throw error;
    }
  }

  /**
   * Mapea recursivamente las respuestas de un cast para crear un historial lineal
   */
  public mapRepliesRecursively(cast: any): ConversationMessage[] {
    elizaLogger.log("\n=== Procesando Cast ===");
    elizaLogger.log("Autor:", cast.author.username);
    elizaLogger.log("Texto:", cast.text);
    elizaLogger.log("Replies:", cast.direct_replies?.length || 0);

    // Creamos el mensaje actual
    let messages: ConversationMessage[] = [
      {
        id: cast.hash,
        author: cast.author.username || cast.author.display_name,
        pfp_url: cast.author.pfp_url,
        text: cast.text,
        timestamp: cast.timestamp,
      },
    ];

    // Procesamos recursivamente las respuestas directas
    if (cast.direct_replies && cast.direct_replies.length > 0) {
      elizaLogger.log(
        `\nProcesando ${cast.direct_replies.length} respuestas de ${cast.author.username}`
      );

      for (const reply of cast.direct_replies) {
        elizaLogger.log(`-> Procesando respuesta de: ${reply.author.username}`);
        const nestedReplies = this.mapRepliesRecursively(reply);
        messages = [...messages, ...nestedReplies];
      }
    }

    return messages;
  }

  /**
   * Obtiene y formatea el historial completo de una conversación
   */
  public async getFormattedConversationHistory(
    threadHash: string
  ): Promise<string> {
    try {
      const conversation = await this.getConversationHistory(threadHash);
      const messages = this.mapRepliesRecursively(
        conversation.conversation.cast
      );
      return formatConversationHistory(messages);
    } catch (error) {
      elizaLogger.error("Error obteniendo historial formateado:", error);
      return "";
    }
  }

  /**
   * Publica una respuesta en la conversación
   */
  public async replyToCast(text: string, parentHash: string): Promise<boolean> {
    try {
      elizaLogger.log(`Publicando respuesta a: ${parentHash}`);
      elizaLogger.log(`Texto: ${text}`);

      const response = await fetch(NEYNAR_CONFIG.API_ENDPOINTS.CAST, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": NEYNAR_CONFIG.CREDENTIALS.API_KEY,
        },
        body: JSON.stringify({
          signer_uuid: NEYNAR_CONFIG.CREDENTIALS.SIGNER_UUID,
          text: text.slice(0, NEYNAR_CONFIG.MAX_MESSAGE_LENGTH),
          parent: parentHash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error publicando respuesta: ${response.statusText}`);
      }

      const data = await response.json();
      elizaLogger.log(
        `Respuesta publicada exitosamente, hash: ${data.cast.hash}`
      );
      return true;
    } catch (error) {
      elizaLogger.error("Error en replyToCast:", error);
      return false;
    }
  }

  /**
   * Verifica si un cast es parte de una conversación específica
   */
  public async isPartOfConversation(
    castHash: string,
    threadHash: string
  ): Promise<boolean> {
    try {
      const conversation = await this.getConversationHistory(threadHash);
      const messages = this.mapRepliesRecursively(
        conversation.conversation.cast
      );
      return messages.some((message) => message.id === castHash);
    } catch (error) {
      elizaLogger.error("Error verificando pertenencia a conversación:", error);
      return false;
    }
  }
}
