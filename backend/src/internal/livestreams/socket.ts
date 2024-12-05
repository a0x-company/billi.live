// dependencies
import { Firestore } from "@google-cloud/firestore";

// third-party
import { Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

// internal
import { LivestreamStorage } from "./storage";
import { connectedUsers } from "./sharedState";

const comments: {
  [key: string]: {
    id: string;
    handle: string;
    pfp: string;
    comment: string;
    timestamp: string;
  }[];
} = {};

export function setupSocket(server: Server, firestore: Firestore) {
  const liveStreamStorage = new LivestreamStorage(firestore);

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

    socket.on("newComment", async ({ streamId, id, handle, pfp, comment, timestamp }) => {
      if (!comments[streamId]) {
        comments[streamId] = [];
      }

      const newComment = { id, handle, pfp, comment, timestamp };
      comments[streamId].push(newComment);
      io.to(streamId).emit("comment", newComment);

      console.log(`New comment in stream: ${streamId}, by: ${handle}`);
    });

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
