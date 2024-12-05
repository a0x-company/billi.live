// third-party
import { Request, Response } from "express";

import { Context } from "./routes";

// types
import { WebhookStatusLivepeerBody } from "@internal/livestreams";

type CustomRequest = Request<unknown, unknown, WebhookStatusLivepeerBody, unknown>;

type CustomResponse = Response<unknown, { warningMessage?: string }>;

export const updateLivestreamStatus = (ctx: Context) => {
  return async ({ body }: CustomRequest, res: CustomResponse) => {
    const { stream } = body;

    let status = "stopped";

    if (stream.isActive) {
      status = "live";
    }

    const updatedLivestream = await ctx.livestreamService.updateLivestreamStatus(stream.id, status);

    return res.status(200).json({
      message: "Livestream status updated",
      warning: res.locals.warningMessage,
    });
  };
};
