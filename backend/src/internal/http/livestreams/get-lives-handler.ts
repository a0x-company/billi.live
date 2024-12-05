// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

export const getLivesHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    const lives = [];

    return res.status(200).json(lives);
  };
};
