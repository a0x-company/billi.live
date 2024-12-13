// dependencies
import { Firestore } from "@google-cloud/firestore";

// services
import { LivepeerService } from "./livepeer";
import { LivestreamStorage } from "./storage";
import { PlayHtService } from "./play-ht";

// types
import {
  ActionType,
  CastInFarcaster,
  CreateLivestreamLivepeerResponse,
  Livestream,
  PostAdditionalData,
  StreamInfo,
} from "./types";

// internal
import { connectedUsers } from "./sharedState";
import { AgentService } from "@internal/agents";

interface LivestreamManager {
  saveLivestream(
    handle: string,
    title: string,
    description: string,
    livepeerInfo: StreamInfo,
    tokenAddress: string,
    pubHash: string,
    pfpUrl?: string,
    castInFarcaster?: CastInFarcaster
  ): Promise<void>;
  updateLivestreamStatus(streamId: string, status: string): Promise<Livestream | null>;
  getLastLivestreamForHandle(handle: string): Promise<Livestream | null>;
  getLives(): Promise<Livestream[]>;
  getLivestreamByTokenAddress(tokenAddress: string): Promise<Livestream | null>;
  addPubHashToLivestream(streamId: string, pubHash: string): Promise<Livestream | null>;
}

interface LivepeerManager {
  createLivestream(name: string, record: boolean): Promise<CreateLivestreamLivepeerResponse>;
}

interface PlayHtManager {
  convertTextToSpeech(text: string): Promise<any>;
}
interface ProfileManager {
  getSignerUuid(handle: string): Promise<string | null>;
}

interface FarcasterManager {
  executeAction(
    actionType: ActionType,
    postId: string,
    additionalData: PostAdditionalData
  ): Promise<string | void>;
  getCastInFarcasterByPubHash(pubHash: string): Promise<CastInFarcaster>;
}

interface AgentManager {
  talkToAgent(message: string): Promise<string>;
}

export class LivestreamService {
  private livestreamStorage: LivestreamManager;

  private livepeerService: LivepeerManager;

  private playHtService: PlayHtManager;

  private profileManager: ProfileManager;

  private farcasterSvc: FarcasterManager;

  private agentService: AgentManager;

  constructor(
    firestore: Firestore,
    profileManager: ProfileManager,
    farcasterSvc: FarcasterManager
  ) {
    this.livestreamStorage = new LivestreamStorage(firestore);
    this.livepeerService = new LivepeerService();
    this.playHtService = new PlayHtService();
    this.profileManager = profileManager;
    this.farcasterSvc = farcasterSvc;
    this.agentService = new AgentService();
  }

  public async createLivestream(
    handle: string,
    title: string,
    description: string,
    tokenAddress: string,
    pubHash: string,
    pfpUrl?: string
  ): Promise<Livestream> {
    const livepeerResponse = await this.livepeerService.createLivestream(title, true);

    const streamInfo: StreamInfo = {
      streamId: livepeerResponse.id,
      playbackUrl: `https://livepeercdn.studio/hls/${livepeerResponse.playbackId}/index.m3u8`,
      embeaddableBroadcastUrl: `https://lvpr.tv/broadcast/${livepeerResponse.streamKey}`,
      streamKey: livepeerResponse.streamKey,
      srtIngestUrl: `srt://rtmp.livepeer.com:2935?streamid=${livepeerResponse.streamKey}`,
    };

    /* DELETE THIS */
    let castInFarcaster;
    try {
      castInFarcaster = await this.farcasterSvc.getCastInFarcasterByPubHash(pubHash);
    } catch (error) {
      console.error("Error getting cast in farcaster by pub hash", error);
    }

    await this.livestreamStorage.saveLivestream(
      handle,
      title,
      description,
      streamInfo,
      tokenAddress,
      pubHash,
      pfpUrl,
      castInFarcaster
    );

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

    console.log("streams", streams);

    console.log("connectedUsers", connectedUsers);

    const streamsWithUserCount = streams.map((stream) => ({
      ...stream,
      userCount: connectedUsers[stream.tokenAddress as string]?.length || 0,
    }));

    return streamsWithUserCount;
  }

  public async getLivestreamByTokenAddress(tokenAddress: string): Promise<Livestream | null> {
    return await this.livestreamStorage.getLivestreamByTokenAddress(tokenAddress);
  }

  public async convertTextToSpeech(text: string): Promise<any> {
    return await this.playHtService.convertTextToSpeech(text);
  }

  /* NOT USED YET */
  public async publishLivestream(livestream: Livestream): Promise<string | void> {
    console.log("PUBLISHING LIVESTREAM");
    if (!livestream.handle) {
      throw new Error("Livestream handle not found");
    }

    const actionType = ActionType.POST;

    const signerUuid = await this.profileManager.getSignerUuid(livestream.handle);
    if (!signerUuid) {
      throw new Error("Signer UUID not found");
    }

    const title = livestream.title.split("-").pop() || livestream.title;
    const postText = `I just went live on /billi.live\n\n${title}\n\n${livestream.description}\n\nCome join us.`;

    const additionalData: PostAdditionalData = {
      signerUuid: signerUuid,
      metadata: {
        type: "LIVESTREAM",
        text: postText,
        handle: livestream.handle,
      },
    };

    const identifier = await this.farcasterSvc.executeAction(actionType, "", additionalData);
    console.log("--------identifier------", identifier);

    if (!identifier) {
      throw new Error("Failed to publish livestream to Farcaster");
    }

    await this.livestreamStorage.addPubHashToLivestream(
      livestream.livepeerInfo.streamId,
      identifier
    );

    return identifier;
  }

  public async talkToAgent(message: string): Promise<string> {
    return await this.agentService.talkToAgent(message);
  }
}
