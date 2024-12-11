// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

export const createLivestreamHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    const { handle, title, description, tokenAddress, pfpUrl, pubHash } = req.body;

    console.log("req.body", req.body);

    if (!handle) {
      return res.status(400).json({
        error: "handle is required in the body",
      });
    }

    if (!title) {
      return res.status(400).json({
        error: "title is required in the body",
      });
    }

    if (!description) {
      return res.status(400).json({
        error: "description is required in the body",
      });
    }

    if (!tokenAddress) {
      return res.status(400).json({
        error: "tokenAddress is required in the body",
      });
    }

    if (!pubHash) {
      return res.status(400).json({
        error: "pubHash is required in the body",
      });
    }

    if (!pfpUrl) {
      return res.status(400).json({
        error: "pfpUrl is required in the body",
      });
    }

    const normalizedTokenAddress = tokenAddress.toLowerCase();

    const livestream = await ctx.livestreamService.createLivestream(
      handle,
      title,
      description,
      normalizedTokenAddress,
      pubHash,
      pfpUrl
    );

    return res.status(200).json({
      message: "livestream created successfully",
      data: livestream,
    });
  };
};
