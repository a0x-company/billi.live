export type CreateLivestreamLivepeerResponse = {
  id: string;
  name: string;
  kind: string;
  creatorId: {
    type: string;
    value: string;
  };
  userTags: Record<string, any>;
  lastSeen: number;
  sourceSegments: number;
  transcodedSegments: number;
  sourceSegmentsDuration: number;
  transcodedSegmentsDuration: number;
  sourceBytes: number;
  transcodedBytes: number;
  ingestRate: number;
  outgoingRate: number;
  isActive: boolean;
  isHealthy: boolean | null;
  issues: any | null;
  createdByTokenName: string;
  createdAt: number;
  parentId: string;
  streamKey: string;
  pull: {
    source: string;
    headers: {
      Authorization: string;
    };
    isMobile: number;
    location: {
      lat: number;
      lon: number;
    };
  };
  playbackId: string;
  playbackPolicy: {
    type: string;
    webhookId: string;
    webhookContext: {
      streamerId: string;
    };
    refreshInterval: number;
    allowedOrigins: string[];
  };
  profiles: {
    width: number;
    name: string;
    height: number;
    bitrate: number;
    fps: number;
    fpsDen: number;
    quality: number;
    gop: number;
    profile: string;
    encoder: string;
  }[];
  record: boolean;
  multistream: {
    targets: {
      id: string;
      profile: string;
    }[];
  };
  suspended: boolean;
  lastTerminatedAt: number;
  userId: string;
  renditions: Record<string, any>;
};

export interface StreamInfo {
  streamId: string;
  playbackUrl: string;
  embeaddableBroadcastUrl: string;
  streamKey: string;
  srtIngestUrl: string;
  description?: string;
}

export type WebhookStatusLivepeerBody = {
  id: string;
  webhookId: string;
  createdAt: number;
  timestamp: number;
  event: string;
  stream: {
    lastSeen: number;
    isActive: boolean;
    record: boolean;
    suspended: boolean;
    sourceSegments: number;
    transcodedSegments: number;
    sourceSegmentsDuration: number;
    transcodedSegmentsDuration: number;
    sourceBytes: number;
    transcodedBytes: number;
    lastTerminatedAt: number | null;
    id: string;
    kind: string;
    name: string;
    issues: string[];
    region: string;
    userId: string;
    profiles: {
      name: string;
      bitrate: number;
      fps: number;
      resolution: string;
    }[];
    createdAt: number;
    isHealthy: boolean;
    ingestRate: number;
    playbackId: string;
    renditions: any;
    multistream: {
      targets: any[];
    };
    outgoingRate: number;
    createdByTokenName: string;
  };
};

export type Livestream = {
  //   email: string;
  title: string;
  tokenAddress?: string;
  livepeerInfo: StreamInfo;
  createdAt: Date;
  status: string;
  handle?: string;
  castInFarcaster?: boolean;
  description?: string;
  pubHash?: string;
  streamedByAgent?: boolean;
};

export enum ActionType {
  DISLIKE = "dislike",
  LIKE = "like",
  UNLIKE = "unlike",
  COMMENT = "comment",
  POST = "cast",
  MIRROR = "recast",
  FOLLOW = "follow",
  UNFOLLOW = "unfollow",
  DELETE = "delete",
}

export type PostAdditionalData = {
  signerUuid: string;
  metadata: {
    type: string;
    text: string;
    handle: string;
    channelId?: string;
  };
};
