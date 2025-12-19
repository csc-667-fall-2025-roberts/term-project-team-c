import { Server as HTTPServer } from "http";
import { Server } from "socket.io";

import { sessionMiddleware } from "@backend/config/session";
import logger from "@backend/lib/logger";
import { GLOBAL_ROOM } from "@shared/keys";
import { User } from "@shared/types";

import { initGameSocket, registerGameHandlers } from "./game-socket";

export const initSockets = (httpServer: HTTPServer) => {
  const io = new Server(httpServer);

  io.engine.use(sessionMiddleware);

  io.on("connection", (socket) => {
  const session = (socket.request as any).session as
    | { id?: string; user?: User }
    | undefined;

  if (!session || !session.user) {
    logger.info(`unauthenticated socket connection: ${socket.id}`);
    return;
  }

  logger.info(`socket for user ${session.user.username} established`);

  if (session.id) {
    socket.join(session.id);
  }
  socket.join(GLOBAL_ROOM);

  const gameId = socket.handshake.query.gameId as string | undefined;
  if (gameId) {
    const id = parseInt(gameId, 10);
    if (!Number.isNaN(id)) {
      initGameSocket(socket, id, session.user.id);
      registerGameHandlers(io, socket, id, session.user.id);  // Add this line
    }
  }


  socket.on("close", () => {
    logger.info(`socket for user ${session.user.username} closed`);
  });
});

  return io;
};
