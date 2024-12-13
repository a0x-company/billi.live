import { Request, Response } from "express";

// socket
import { getIO } from "@internal/livestreams/socket";

// context
import { Context } from "./routes";

export const responseToCastInFarcasterHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    if (req.body.data.author.username === "tsukasachan") {
      console.log("Viene desde tsukasa");
    }

    const liveForHandle = await ctx.livestreamService.getLastLivestreamForHandle(
      req.body.data.author.username
    );

    if (liveForHandle?.threadHash === req.body.data.thread_hash) {
      const audioBuffer = await ctx.livestreamService.convertTextToSpeech(
        req.body.data.text,
        req.body.data.author.username
      );

      const audioBase64 = audioBuffer.toString("base64");
      const io = getIO();

      console.log("Emitiendo audio y texto", liveForHandle?.tokenAddress);

      io.to(liveForHandle?.tokenAddress as string).emit("new-audio", {
        audio: audioBase64,
        text: req.body.data.text,
      });
    }

    return res.status(200).json({
      message: "the webhook is working",
    });
  };
};
