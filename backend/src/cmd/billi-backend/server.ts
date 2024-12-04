// dependencies
import { http } from "../../internal/index";

// envs
const { NODE_ENV } = process.env;
if (!NODE_ENV || !NODE_ENV.length) {
  throw new Error("invalid NODE_ENV env value");
}

// http
const { app, server } = http.http.createServer();
http.livestreamsRoutes(app, {});

export default server;
