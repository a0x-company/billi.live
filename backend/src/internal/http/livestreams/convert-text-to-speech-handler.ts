// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

export const convertTextToSpeechHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    const { text } = req.body;

    const speech = await ctx.livestreamService.convertTextToSpeech(text);

    return res.status(200).json({
      message: "speech generated successfully",
      data: speech,
    });
  };
};
