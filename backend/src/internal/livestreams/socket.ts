// dependencies
import { Firestore } from "@google-cloud/firestore";

// third-party
import { Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

// internal
import { LivestreamStorage } from "./storage";
import { connectedUsers } from "./sharedState";
import { ActionType } from "./types";
import { ProfilesService } from "@internal/profiles";
import { FarcasterService } from "@internal/farcaster";
import { PlayHtService } from "./play-ht";
import { AgentService } from "@internal/agent/agent";

let globalIO: SocketIOServer;

const comments: {
  [key: string]: {
    id: string;
    handle: string;
    pfp: string;
    comment: string;
    timestamp: string;
    replies?: string[];
  }[];
} = {};

export function setupSocket(server: Server, firestore: Firestore) {
  const liveStreamStorage = new LivestreamStorage(firestore);

  const profileService = new ProfilesService(firestore);

  const farcasterService = new FarcasterService(firestore);

  const playHtService = new PlayHtService();

  const agentService = new AgentService(firestore);

  console.log(
    "setting up socket.io for counting users in streams, handling comments in billi.live"
  );

  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
    pingInterval: 10000,
    pingTimeout: 120000,
  });

  globalIO = io;

  io.on("connection", (socket: Socket) => {
    console.log("A user connected with socket ID:", socket.id);

    socket.on("joinStream", ({ streamId, handle }) => {
      socket.join(streamId);

      if (!connectedUsers[streamId]) {
        connectedUsers[streamId] = [];
      }

      connectedUsers[streamId].push({ socketId: socket.id, handle });

      io.to(streamId).emit("userCount", {
        count: connectedUsers[streamId].length,
        users: connectedUsers[streamId].map((user) => user.handle),
      });

      if (comments[streamId]) {
        io.to(streamId).emit("previousComments", comments[streamId]);
      }

      console.log(
        `User ${handle} joined stream: ${streamId}, count: ${connectedUsers[streamId].length}`
      );
    });

    socket.on("leaveStream", (streamId: string) => {
      socket.leave(streamId);

      if (connectedUsers[streamId]) {
        connectedUsers[streamId] = connectedUsers[streamId].filter(
          (user) => user.socketId !== socket.id
        );

        io.to(streamId).emit("userCount", {
          count: connectedUsers[streamId].length,
          users: connectedUsers[streamId].map((user) => user.handle),
        });

        console.log(`User left stream: ${streamId}, count: ${connectedUsers[streamId].length}`);
      }
    });

    socket.on("disconnecting", () => {
      console.log(`User with socket ID ${socket.id} is disconnecting`);

      const rooms = Array.from(socket.rooms);

      rooms.forEach((room) => {
        if (room !== socket.id && connectedUsers[room]) {
          connectedUsers[room] = connectedUsers[room].filter((user) => user.socketId !== socket.id);

          io.to(room).emit("userCount", {
            count: connectedUsers[room].length,
            users: connectedUsers[room].map((user) => user.handle),
          });

          console.log(
            `User disconnected from stream: ${room}, count: ${connectedUsers[room].length}`
          );
        }
      });
    });

    socket.on("disconnect", (reason: any) => {
      console.log(`User with socket ID ${socket.id} disconnected:`, reason);
      console.log("User disconnected with socket ID:", socket.id);
    });

    socket.on(
      "newComment",
      async ({
        streamId,
        id,
        handle,
        pfp,
        comment,
        timestamp,
        parentIdentifier = null,
        hosterIsAgent = false,
      }) => {
        let time = performance.now();
        console.log("hosterIsAgent", hosterIsAgent);

        /* interact with agent */
        if (hosterIsAgent) {
          (async () => {
            try {
              const agentResponse = await agentService.interactWithAgent(comment);
              const text = agentResponse[0].text;

              const audioPromise = playHtService
                .convertTextToSpeech(text, "heybilli")
                .then((buffer) => {
                  const audioBase64 = buffer.toString("base64");
                  const io = getIO();
                  io.to(streamId).emit("new-audio", {
                    audio: audioBase64,
                    text: text,
                  });
                });

              audioPromise.catch((error) => {
                console.error("Error converting text to speech:", error);
              });
              time = performance.now() - time;
              console.log("time", time);
            } catch (error) {
              console.error("Error interacting with agent:", error);
            }
          })();
        } else {
          (async () => {
            const tags = ["heybilli", "billi"];
            const hasTagAgent = tags.some((tag) => comment.includes(tag));
            if (hasTagAgent) {
              const agentResponse = await agentService.interactWithAgent(comment);
              const text = agentResponse[0].text;

              const newCommentByAgent = {
                id,
                handle: "heybilli",
                pfp: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/c25730b6-e1db-45ff-e874-f72d5dc05a00/rectcrop3",
                comment: text,
                timestamp,
                parentIdentifier,
              };

              comments[streamId].push(newCommentByAgent);
              io.to(streamId).emit("comment", newCommentByAgent);
            }
          })();
        }

        if (!comments[streamId]) {
          comments[streamId] = [];
        }

        const newComment = { id, handle, pfp, comment, timestamp, parentIdentifier };
        comments[streamId].push(newComment);

        io.to(streamId).emit("comment", newComment);
        try {
          if (!handle) {
            throw new Error("No handle found for comment: " + comment);
          }

          const signerUuid = await profileService.getSignerUuid(handle);

          const tokenAddressNormalized = streamId.toLowerCase();
          const pubHash = await liveStreamStorage.getPubHashByTokenAddress(tokenAddressNormalized);

          if (!pubHash || !signerUuid) {
            throw new Error("No pubHash or signerUuid found for streamId: " + streamId);
          }

          const actionType = ActionType.COMMENT;
          const postId = parentIdentifier ? parentIdentifier : pubHash;

          if (parentIdentifier) {
            const parentComment = comments[streamId].find((c) => c.id === parentIdentifier);
            if (!parentComment) {
              throw new Error("Parent comment not found");
            }
            parentComment.replies?.push(newComment.id);
          }

          const commentData = {
            signerUuid,
            content: comment,
          };

          const identifier = await farcasterService.executeAction(actionType, postId, commentData);
          newComment.id = identifier || "";
          io.to(streamId).emit("commentUpdated", newComment);
          console.log(`Successfully published comment: ${identifier}`);
        } catch (error) {
          console.error("Error publishing comment:", error);
        }
        console.log(`New comment in stream: ${streamId}, by: ${handle}`);
      }
    );

    socket.on("action", ({ streamId, handle, action }) => {
      io.to(streamId).emit("action", {
        handle,
        action,
      });

      console.log(`Action in stream ${streamId}: ${action} by ${handle}`);
    });
  });

  return io;
}

export function getIO() {
  if (!globalIO) {
    throw new Error("Socket.IO no ha sido inicializado");
  }
  return globalIO;
}
