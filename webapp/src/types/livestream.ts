export interface LivepeerInfo {
  embeaddableBroadcastUrl: string;
  playbackUrl: string;
  srtIngestUrl: string;
  streamId: string;
  streamKey: string;
}

interface Timestamp {
  _seconds: number;
  _nanoseconds: number;
}

export interface Livestream {
  tokenAddress?: string;
  handle?: string;
  title: string;
  createdAt: Timestamp;
  description: string;
  livepeerInfo: LivepeerInfo;
  status: string;
  streamedByAgent?: boolean;
  userCount: number;
  pfpUrl?: string;
  pubHash?: string;
  cast?: Cast;
}

export type StreamResponse = Livestream | LivestreamError;
export enum LivestreamError {
  LIVESTREAM_NOT_FOUND = "Livestream not found",
  UNKNOWN_ERROR = "An unknown error occurred",
  ADDRESS_REQUIRED = "address is required",
}
export interface Comment {
  id: string;
  handle: string;
  pfp: string;
  comment: string;
  timestamp: string;
}

export interface Cast {
  pubHash: string;
  hash: string;
  author: {
    username: string;
    display_name: string;
    pfp_url: string;
  };
  text: string;
  timestamp: string;
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  replies: {
    count: number;
  };
}

export enum CastError {
  CAST_NOT_FOUND = "Cast not found",
  UNKNOWN_ERROR = "An unknown error occurred",
}
