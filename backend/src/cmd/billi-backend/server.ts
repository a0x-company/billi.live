// dependencies
import { internal } from "../../internal/index";

// envs
const { NODE_ENV } = process.env;
if (!NODE_ENV || !NODE_ENV.length) {
  throw new Error("invalid NODE_ENV env value");
}

// http
const { app, server } = internal.http.createServer();
internal.livestreamsRoutes(app, {});

export default server;
