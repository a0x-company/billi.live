// dependencies
import { Firestore } from "@google-cloud/firestore";

// internal
import { http, config, livestreams, profiles, farcaster } from "@internal";
import { setupSocket } from "@internal/livestreams/socket";

config.validateRequiredEnvs();

// clients
const firestore = new Firestore({ projectId: config.PROJECT_ID });

// services
const farcasterSvc = new farcaster.FarcasterService(firestore);
const profilesService = new profiles.ProfilesService(firestore);
const livestreamService = new livestreams.LivestreamService(
  firestore,
  profilesService,
  farcasterSvc
);
// http
const { app, server } = http.createServer();
http.livestreamsRoutes(app, { livestreamService });

// socket.io
setupSocket(server, firestore);

export default server;
