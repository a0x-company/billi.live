import { Request, Response } from "express";

import { Context } from "./routes";

export const getLivesForLandingHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    res.status(200).json({ data: await ctx.livestreamService.getLivesForLanding() });
  };
};
