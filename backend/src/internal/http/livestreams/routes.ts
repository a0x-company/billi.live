// third-party
import { Express, RequestHandler, Router } from "express";

import { getLivesHandler } from "./get-lives-hander";

export type Context = {};

export function livestreamsRoutes(router: Express, ctx: Context) {
  const livestreamsRouter = Router();

  livestreamsRouter.get("/lives", getLivesHandler(ctx));

  router.use("/livestreams", livestreamsRouter);
}
