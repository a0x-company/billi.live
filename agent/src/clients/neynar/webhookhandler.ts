import { elizaLogger } from "@ai16z/eliza";
import { WebhookCache, WebhookPayload } from "./types";
import { NEYNAR_CONFIG } from "./config.ts";

export class WebhookHandler {
  private webhookCache: WebhookCache[] = [];

  /**
   * Limpia webhooks antiguos del caché basado en el timeout configurado
   */
  private cleanupCache(): void {
    const now = Date.now();
    const previousLength = this.webhookCache.length;

    this.webhookCache = this.webhookCache.filter(
      (entry) => now - entry.timestamp < NEYNAR_CONFIG.WEBHOOK_CACHE_TIMEOUT
    );

    if (previousLength !== this.webhookCache.length) {
      elizaLogger.log(
        `Caché limpiado: ${previousLength} -> ${this.webhookCache.length} entradas`
      );
    }
  }

  /**
   * Verifica si un webhook es duplicado y lo almacena si es nuevo
   */
  public isDuplicateWebhook(payload: WebhookPayload): boolean {
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
      elizaLogger.log(
        `Nuevo webhook recibido de ${payload.data.author.username}`
      );
    } else {
      elizaLogger.log(
        `Webhook duplicado detectado de ${payload.data.author.username}`
      );
    }

    return isDuplicate;
  }

  /**
   * Obtiene el estado actual del caché
   */
  public getCacheStatus(): { total: number; entries: WebhookCache[] } {
    return {
      total: this.webhookCache.length,
      entries: [...this.webhookCache],
    };
  }
}
