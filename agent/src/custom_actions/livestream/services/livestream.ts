import { elizaLogger } from "@ai16z/eliza";
import { LivestreamCreateParams, StreamDetails } from "../types.ts";

export class LivestreamService {
  constructor(private apiUrl: string) {}

  async createLivestream(params: LivestreamCreateParams) {
    try {
      const response = await fetch(
        `${this.apiUrl}/livestreams/create-livestream`,
        {
          method: "POST",
          body: JSON.stringify(params),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      elizaLogger.log("Response:", response);
      return response.json();
    } catch (error) {
      elizaLogger.error("Error creating livestream:", error);
      return null;
    }
  }

  async updateStreamedByAgent(streamId: string, isStreamedByAgent: boolean) {
    try {
      const response = await fetch(
        `${this.apiUrl}/livestreams/streamed-by-agent`,
        {
          method: "PUT",
          body: JSON.stringify({
            streamId,
            isStreamedByAgent,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      elizaLogger.log("Response:", response);
      return response.json();
    } catch (error) {
      elizaLogger.error("Error updating streamedByAgent:", error);
      return null;
    }
  }
  async getLivestreamByTokenAddress(
    tokenAddress: string
  ): Promise<{ handle?: string; castHash?: string } | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/livestreams/livestream-by-token-address?tokenAddress=${tokenAddress}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      return {
        handle: data.handle,
        castHash: data.pubHash,
      };
    } catch (error) {
      elizaLogger.error("Error getting livestream by token address:", error);
      return null;
    }
  }
  getMissingFields(details: StreamDetails): string[] {
    const missingFields = [];
    if (!details.title) missingFields.push("título");
    if (!details.description) missingFields.push("descripción");
    if (!details.tokenSymbol)
      missingFields.push("símbolo del token (2-5 caracteres)");
    if (!details.tokenName) missingFields.push("nombre del token");
    return missingFields;
  }
}
