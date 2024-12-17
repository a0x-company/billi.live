export interface MessageMetadata {
  castHash?: string;
  author?: {
    username: string;
    pfp_url: string;
  };
  embeds?: {
    url: string;
  }[];
  parentHash?: string;
  threadHash?: string;
}

export interface StreamDetails {
  title: string;
  description: string;
  tokenSymbol: string;
  tokenName: string;
  handle?: string;
}

export type GenerateTextPurpose =
  | "request_details"
  | "token_creation"
  | "success_message"
  | "start_stream";

export interface TextGeneratorDetails {
  missingFields?: string[];
  tokenName?: string;
  tokenSymbol?: string;
  title?: string;
  livestreamLink?: string;
  handle?: string;
}

export interface LivestreamCreateParams {
  handle: string;
  title: string;
  description: string;
  pfpUrl: string;
  pubHash: string;
  tokenAddress: string;
}
