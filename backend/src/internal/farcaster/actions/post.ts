import { FarcasterActionStrategy } from ".";

export interface PostAdditionalData {
  signerUuid: string;
  metadata: {
    type: string;
    text?: string;
    uuid?: string;
    channelId?: string;
    handle?: string;
    quoteHash?: string;
  };
}

export class PostStrategy implements FarcasterActionStrategy {
  constructor(private client: any) {}

  async execute(postId: string, additionalData?: PostAdditionalData): Promise<void | string> {
    if (!additionalData) {
      throw new Error("Additional data is required for the post.");
    }

    const { signerUuid, metadata } = additionalData;

    const data: any = {
      signer_uuid: signerUuid,
      text: metadata.text,
    };

    if (metadata.channelId) {
      data.channel_id = metadata.channelId;
    }

    data.embeds = [];

    // if (metadata.type === "LIVESTREAM") {
    //   data.channel_id = data.channel_id || "vibra";
    //   data.embeds.push({
    //     url: `https://www.vibra.so/stream/${metadata.handle}`,
    //   });
    // }

    try {
      const response = await this.client.post("/cast", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.info("Publicado en Farcaster");
      return response.data.cast.hash;
    } catch (err: any) {
      console.error("Error al publicar en Farcaster", err);
      throw new Error(`Error: ${err.message}`);
    }
  }
}
