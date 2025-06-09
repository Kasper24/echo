import { Server as SocketIoServer, Socket } from "socket.io";
import type { Server } from "node:http";

const createSocketIoServer = (server: Server) => {
  const io = new SocketIoServer(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("a user connected: ", socket.id);
  });
};

export { createSocketIoServer };
