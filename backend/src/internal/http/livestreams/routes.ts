// third-party
import { Express, RequestHandler, Router } from "express";

// handlers
import { getLivesHandler } from "./get-lives-hander";
import { createLivestreamHandler } from "./create-livestream-handler";

export type Context = {};

export function livestreamsRoutes(router: Express, ctx: Context) {
  const livestreamsRouter = Router();

  livestreamsRouter.post("/create-livestream", createLivestreamHandler(ctx));

  livestreamsRouter.get("/lives", getLivesHandler(ctx));

  router.use("/livestreams", livestreamsRouter);
}
