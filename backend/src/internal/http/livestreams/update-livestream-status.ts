// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

// types
import { Livestream, WebhookStatusLivepeerBody } from "@internal/livestreams";

type CustomRequest = Request<unknown, unknown, WebhookStatusLivepeerBody, unknown>;

type CustomResponse = Response<unknown, { warningMessage?: string }>;

export const updateLivestreamStatus = (ctx: Context) => {
  return async ({ body }: CustomRequest, res: CustomResponse) => {
    const { stream } = body;

    let status = "stopped";

    if (stream.isActive) {
      status = "live";
    }

    await ctx.livestreamService.updateLivestreamStatus(stream.id, status);

    /* NOT USED YET */
    // if (updatedLivestream) {
    //   if (updatedLivestream.pubHash) {
    //     console.log("⚠️ Stream already published");
    //     res.locals.warningMessage = "Livestream status updated, but has already been published";
    //   } else {
    //     await handleLiveStream(ctx, updatedLivestream, res);
    //   }
    // }

    return res.status(200).json({
      message: "Livestream status updated",
      warning: res.locals.warningMessage,
    });
  };
};

async function handleLiveStream(ctx: Context, updatedLivestream: Livestream, res: CustomResponse) {
  const pubHash = await ctx.livestreamService.publishLivestream(updatedLivestream);

  if (!pubHash) {
    console.warn("⚠️ Unable to publish livestream");
    res.locals.warningMessage = "Livestream status updated, but publishing was unsuccessful";
  } else {
    console.log("🎥 Livestream published successfully");
  }
}
