// third-party
import { Express, RequestHandler, Router } from "express";

// handlers
import { getLivesHandler } from "./get-lives-hander";
import { createLivestreamHandler } from "./create-livestream-handler";
import { updateLivestreamStatus } from "./update-livestream-status";

// types
import { Livestream } from "@internal/livestreams/types";

export type Context = {
  livestreamService: LivestreamManager;
};

interface LivestreamManager {
  createLivestream(title: string, description: string): Promise<Livestream>;
  updateLivestreamStatus(streamId: string, status: string): Promise<Livestream | null>;
}

export function livestreamsRoutes(router: Express, ctx: Context) {
  const livestreamsRouter = Router();

  livestreamsRouter.post("/create-livestream", createLivestreamHandler(ctx));

  livestreamsRouter.get("/lives", getLivesHandler(ctx));

  // just for webhook
  livestreamsRouter.post("/update-livestream-status", updateLivestreamStatus(ctx));

  router.use("/livestreams", livestreamsRouter);
}
