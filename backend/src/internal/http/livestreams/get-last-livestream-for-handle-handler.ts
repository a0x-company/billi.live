// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

type GetLastLivestreamForHandleRequestQuery = {
  handle: string;
};

type CustomRequest = Request<unknown, unknown, unknown, GetLastLivestreamForHandleRequestQuery>;

export const getLastLivestreamForHandleHandler = (ctx: Context) => {
  return async ({ query }: CustomRequest, res: Response) => {
    const handle = query.handle;

    if (!handle) {
      return res.status(400).json({ error: "handle is required as query params" });
    }

    const lastLivestream = await ctx.livestreamService.getLastLivestreamForHandle(handle);

    if (!lastLivestream) {
      return res.status(404).json({ error: "No livestream found for handle" });
    }

    return res.status(200).json(lastLivestream);
  };
};
