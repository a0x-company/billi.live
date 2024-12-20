export interface NeynarConfig {
  apiKey: string;
  signerUuid: string;
  fid: number;
}

export interface WebhookCache {
  hash: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface WebhookPayload {
  created_at: number;
  type: string;
  data: {
    object: string;
    hash: string;
    thread_hash: string;
    parent_hash: string | null;
    parent_url: string | null;
    root_parent_url: string | null;
    parent_author: {
      fid: number;
    } | null;
    author: {
      fid: number;
      username: string;
      display_name: string;
      pfp_url: string;
    };
    text: string;
    timestamp: string;
    embeds: Array<{ url: string }>;
    mentioned_profiles: Array<{
      fid: number;
      username: string;
      display_name: string;
      pfp_url: string;
    }>;
    channel: {
      name: string;
      description: string;
    };
  };
}

export interface ConversationMessage {
  id: string;
  author: string;
  pfp_url: string;
  text: string;
  timestamp: string;
}

export interface Memory {
  id: string;
  userId: string;
  agentId: string;
  roomId: string;
  content: {
    text: string;
    source: string;
    responded_mentions?: string[];
    metadata?: any;
    action?: string;
    fromAction?: boolean;
  };
  createdAt: number;
}
