// third-party
import { Express, RequestHandler, Router } from "express";

// handlers
import { getLivesHandler } from "./get-lives-hander";
import { createLivestreamHandler } from "./create-livestream-handler";

// types
import { Livestream } from "@internal/livestreams/types";

export type Context = {
  livestreamService: LivestreamManager;
};

interface LivestreamManager {
  createLivestream(title: string, description: string): Promise<Livestream>;
}

export function livestreamsRoutes(router: Express, ctx: Context) {
  const livestreamsRouter = Router();

  livestreamsRouter.post("/create-livestream", createLivestreamHandler(ctx));

  livestreamsRouter.get("/lives", getLivesHandler(ctx));

  router.use("/livestreams", livestreamsRouter);
}
