// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

type GetLivestreamByTokenAddressRequestQuery = {
  tokenAddress: string;
};

type CustomRequest = Request<unknown, unknown, unknown, GetLivestreamByTokenAddressRequestQuery>;

export const getLivestreamByTokenAddressHandler = (ctx: Context) => {
  return async ({ query }: CustomRequest, res: Response) => {
    const tokenAddress = query.tokenAddress;

    if (!tokenAddress) {
      return res.status(400).json({ error: "tokenAddress is required as query params" });
    }

    const livestream = await ctx.livestreamService.getLivestreamByTokenAddress(tokenAddress);

    console.log("livestream", livestream);

    if (!livestream) {
      return res.status(404).json({ error: "No livestream found for token address" });
    }

    return res.status(200).json(livestream);
  };
};
