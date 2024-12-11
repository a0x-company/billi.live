import { AxiosInstance } from "axios";
import { FarcasterActionStrategy } from ".";

interface CommentAdditionalData {
  signerUuid: string;
  content: string;
}

export class CommentStrategy implements FarcasterActionStrategy {
  constructor(private client: AxiosInstance) {}

  async execute(postId: string, additionalData?: CommentAdditionalData): Promise<void> {
    if (!additionalData) {
      throw new Error("Additional data is required for commenting");
    }

    try {
      const response = await this.client.post(
        "/cast",
        {
          text: additionalData.content,
          signer_uuid: additionalData.signerUuid,
          parent: postId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.info("Commented on Farcaster");
      return response.data.cast.hash;
    } catch (err: any) {
      console.error("Error commenting on Farcaster", err);
      throw new Error(`Error: ${err.message}`);
    }
  }
}
