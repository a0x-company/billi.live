import { Request, Response } from "express";
import { Context } from "./routes";

export const updateStreamedByAgentHandler = (ctx: Context) => {
  return async (req: Request, res: Response) => {
    const { streamId, isStreamedByAgent } = req.body;

    console.log("req.body", req.body);

    if (!streamId) {
      return res.status(400).json({
        error: "streamId is required in the body",
      });
    }

    if (typeof isStreamedByAgent !== "boolean") {
      return res.status(400).json({
        error: "isStreamedByAgent must be a boolean value",
      });
    }

    try {
      const updatedLivestream = await ctx.livestreamService.updateStreamedByAgent(
        streamId,
        isStreamedByAgent
      );

      if (!updatedLivestream) {
        return res.status(404).json({
          error: "Livestream not found",
        });
      }

      return res.status(200).json({
        message: "streamedByAgent updated successfully",
        data: updatedLivestream,
      });
    } catch (error) {
      console.error("Error updating streamedByAgent:", error);
      return res.status(500).json({
        error: "Internal server error updating streamedByAgent",
      });
    }
  };
};
