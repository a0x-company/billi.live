// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

export const createLivestreamHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    const { handle, title, description } = req.body;

    if (!handle) {
      return res.status(401).json({
        error: "handle is required in the body",
      });
    }

    if (!title) {
      return res.status(401).json({
        error: "title is required in the body",
      });
    }

    if (!description) {
      return res.status(401).json({
        error: "description is required in the body",
      });
    }

    const livestream = await ctx.livestreamService.createLivestream(handle, title, description);

    return res.status(200).json({
      message: "livestream created successfully",
      data: livestream,
    });
  };
};
