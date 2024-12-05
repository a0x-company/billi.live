// dependencies
import { Firestore } from "@google-cloud/firestore";

// internal
import { http, config, livestreams } from "@internal";
import { setupSocket } from "@internal/livestreams/socket";

config.validateRequiredEnvs();

// clients
const firestore = new Firestore({ projectId: config.PROJECT_ID });

// services
const livestreamService = new livestreams.LivestreamService(firestore);

// http
const { app, server } = http.createServer();
http.livestreamsRoutes(app, { livestreamService });

// socket.io
setupSocket(server, firestore);

export default server;
