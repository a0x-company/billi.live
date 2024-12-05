// dependencies
import { Firestore } from "@google-cloud/firestore";

// services
import { LivepeerService } from "./livepeer";
import { LivestreamStorage } from "./storage";

// types
import { CreateLivestreamLivepeerResponse, Livestream, StreamInfo } from "./types";

// internal
import { connectedUsers } from "./sharedState";

interface LivestreamManager {
  saveLivestream(
    handle: string,
    title: string,
    description: string,
    livepeerInfo: StreamInfo
  ): Promise<void>;
  updateLivestreamStatus(streamId: string, status: string): Promise<Livestream | null>;
  getLastLivestreamForHandle(handle: string): Promise<Livestream | null>;
  getLives(): Promise<Livestream[]>;
  getLivestreamByTokenAddress(tokenAddress: string): Promise<Livestream | null>;
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

  public async createLivestream(
    handle: string,
    title: string,
    description: string
  ): Promise<Livestream> {
    const livepeerResponse = await this.livepeerService.createLivestream(title, true);

    const streamInfo: StreamInfo = {
      streamId: livepeerResponse.id,
      playbackUrl: `https://livepeercdn.studio/hls/${livepeerResponse.playbackId}/index.m3u8`,
      embeaddableBroadcastUrl: `https://lvpr.tv/broadcast/${livepeerResponse.streamKey}`,
      streamKey: livepeerResponse.streamKey,
      srtIngestUrl: `srt://rtmp.livepeer.com:2935?streamid=${livepeerResponse.streamKey}`,
    };

    await this.livestreamStorage.saveLivestream(handle, title, description, streamInfo);

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

  public async getLastLivestreamForHandle(handle: string): Promise<Livestream | null> {
    return await this.livestreamStorage.getLastLivestreamForHandle(handle);
  }

  public async getLivesForLanding() {
    const streams = await this.livestreamStorage.getLives();

    const streamsWithUserCount = streams.map((stream) => ({
      ...stream,
      userCount: connectedUsers[stream.livepeerInfo.streamId]?.length || 0,
    }));

    return streamsWithUserCount;
  }

  public async getLivestreamByTokenAddress(tokenAddress: string): Promise<Livestream | null> {
    return await this.livestreamStorage.getLivestreamByTokenAddress(tokenAddress);
  }
}
