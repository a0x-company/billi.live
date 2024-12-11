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
