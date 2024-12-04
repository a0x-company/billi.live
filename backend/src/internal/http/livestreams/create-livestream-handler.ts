// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

export const createLivestreamHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    return res.status(200).json({ data: { message: "ok" } });
  };
};
