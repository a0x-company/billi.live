// dependencies
import { Firestore } from "@google-cloud/firestore";
import { http, config, livestreams } from "@internal";

// envs
const { NODE_ENV } = process.env;
if (!NODE_ENV || !NODE_ENV.length) {
  throw new Error("invalid NODE_ENV env value");
}

// clients
const firestore = new Firestore({ projectId: config.PROJECT_ID });

// services
const livestreamService = new livestreams.LivestreamService(firestore);

// http
const { app, server } = http.http.createServer();
http.livestreamsRoutes(app, { livestreamService });

export default server;
