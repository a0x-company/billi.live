// dependencies
import { http } from "@internal";

import { Router } from "express";

// envs
const { NODE_ENV } = process.env;
if (!NODE_ENV || !NODE_ENV.length) {
  throw new Error("invalid NODE_ENV env value");
}

// http
const { app, server } = http.createServer();
const exampleRouter = Router();
exampleRouter.get("/endpoint", (_, res) => {
  res.json({ data: { environment: NODE_ENV } });
});
app.use("/example", exampleRouter);

export default server;
