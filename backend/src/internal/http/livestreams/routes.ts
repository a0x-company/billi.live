// third-party
import { Express, RequestHandler, Router } from "express";

// handlers
// import { getLivesHandler } from "./get-lives-handler";
import { createLivestreamHandler } from "./create-livestream-handler";
import { updateLivestreamStatus } from "./update-livestream-status";
import { getLastLivestreamForHandleHandler } from "./get-last-livestream-for-handle-handler";
import { getLivesForLandingHandler } from "./get-lives-for-landing-handler";
import { getLivestreamByTokenAddressHandler } from "./get-livestream-for-token-address-handler";
import { convertTextToSpeechHandler } from "./convert-text-to-speech-handler";
import { updateStreamedByAgentHandler } from "./update-livestream-by-agent";
import { responseToCastInFarcasterHandler } from "./response-to-cast-in-farcaster-handler";

// types
import { Livestream } from "@internal/livestreams/types";

export type Context = {
  livestreamService: LivestreamManager;
};

interface LivestreamManager {
  createLivestream(
    handle: string,
    title: string,
    description: string,
    tokenAddress: string,
    pubHash: string,
    pfpUrl?: string
  ): Promise<Livestream>;
  updateLivestreamStatus(streamId: string, status: string): Promise<Livestream | null>;
  getLastLivestreamForHandle(handle: string): Promise<Livestream | null>;
  getLivesForLanding(): Promise<Livestream[]>;
  getLivestreamByTokenAddress(tokenAddress: string): Promise<Livestream | null>;
  convertTextToSpeech(text: string, agentHandle: string): Promise<any>;
  publishLivestream(livestream: Livestream): Promise<string | void>;
  talkToAgent(message: string): Promise<string>;
  updateStreamedByAgent(streamId: string, isStreamedByAgent: boolean): Promise<Livestream | null>;
}

export function livestreamsRoutes(router: Express, ctx: Context) {
  const livestreamsRouter = Router();

  livestreamsRouter.post("/create-livestream", createLivestreamHandler(ctx));

  // livestreamsRouter.get("/lives", getLivesHandler(ctx));

  // just for webhook
  livestreamsRouter.post("/update-livestream-status", updateLivestreamStatus(ctx));

  livestreamsRouter.get("/livestream-for-handle", getLastLivestreamForHandleHandler(ctx));

  livestreamsRouter.get("/lives-for-landing", getLivesForLandingHandler(ctx));

  livestreamsRouter.get("/livestream-by-token-address", getLivestreamByTokenAddressHandler(ctx));

  livestreamsRouter.post("/convert-text-to-speech", convertTextToSpeechHandler(ctx));

  livestreamsRouter.post("/streamed-by-agent", updateStreamedByAgentHandler(ctx));
  router.use("/livestreams", livestreamsRouter);

  // use
  livestreamsRouter.post("/response-to-cast-in-farcaster", responseToCastInFarcasterHandler(ctx));
}
