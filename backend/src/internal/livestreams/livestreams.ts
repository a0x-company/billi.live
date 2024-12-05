// dependencies
import { Firestore } from "@google-cloud/firestore";

// services
import { LivepeerService } from "./livepeer";
import { LivestreamStorage } from "./storage";

// types
import { CreateLivestreamLivepeerResponse, Livestream, StreamInfo } from "./types";

interface LivestreamManager {
  saveLivestream(title: string, description: string, livepeerInfo: StreamInfo): Promise<void>;
  updateLivestreamStatus(streamId: string, status: string): Promise<Livestream | null>;
}

interface LivepeerManager {
  createLivestream(name: string, record: boolean): Promise<CreateLivestreamLivepeerResponse>;
}

export class LivestreamService {
  private livestreamStorage: LivestreamManager;

  private livepeerService: LivepeerManager;

  constructor(firestore: Firestore) {
    this.livestreamStorage = new LivestreamStorage(firestore);
    this.livepeerService = new LivepeerService();
  }

  public async createLivestream(title: string, description: string): Promise<Livestream> {
    const livepeerResponse = await this.livepeerService.createLivestream(title, true);

    const streamInfo: StreamInfo = {
      streamId: livepeerResponse.id,
      playbackUrl: `https://livepeercdn.studio/hls/${livepeerResponse.playbackId}/index.m3u8`,
      embeaddableBroadcastUrl: `https://lvpr.tv/broadcast/${livepeerResponse.streamKey}`,
      streamKey: livepeerResponse.streamKey,
      srtIngestUrl: `srt://rtmp.livepeer.com:2935?streamid=${livepeerResponse.streamKey}`,
    };

    await this.livestreamStorage.saveLivestream(title, description, streamInfo);

    const livestream: Livestream = {
      title: title,
      livepeerInfo: streamInfo,
      createdAt: new Date(),
      status: "created",
    };

    return livestream;
  }

  public async updateLivestreamStatus(
    streamId: string,
    status: string
  ): Promise<Livestream | null> {
    return await this.livestreamStorage.updateLivestreamStatus(streamId, status);
  }
}
