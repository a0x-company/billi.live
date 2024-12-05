// third-party
import { Express, RequestHandler, Router } from "express";

// handlers
import { getLivesHandler } from "./get-lives-handler";
import { createLivestreamHandler } from "./create-livestream-handler";
import { updateLivestreamStatus } from "./update-livestream-status";
import { getLastLivestreamForHandleHandler } from "./get-last-livestream-for-handle-handler";

// types
import { Livestream } from "@internal/livestreams/types";

export type Context = {
  livestreamService: LivestreamManager;
};

interface LivestreamManager {
  createLivestream(handle: string, title: string, description: string): Promise<Livestream>;
  updateLivestreamStatus(streamId: string, status: string): Promise<Livestream | null>;
  getLastLivestreamForHandle(handle: string): Promise<Livestream | null>;
}

export function livestreamsRoutes(router: Express, ctx: Context) {
  const livestreamsRouter = Router();

  livestreamsRouter.post("/create-livestream", createLivestreamHandler(ctx));

  livestreamsRouter.get("/lives", getLivesHandler(ctx));

  // just for webhook
  livestreamsRouter.post("/update-livestream-status", updateLivestreamStatus(ctx));

  livestreamsRouter.get("/info", getLastLivestreamForHandleHandler(ctx));

  router.use("/livestreams", livestreamsRouter);
}
