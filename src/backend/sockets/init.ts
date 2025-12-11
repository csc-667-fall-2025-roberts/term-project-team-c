import { Server as HTTPServer } from "http";
import { Server } from "socket.io";

import { sessionMiddleware } from "@backend/config/session";
import logger from "@backend/lib/logger";
import { GLOBAL_ROOM } from "@shared/keys";
import { User } from "@shared/types";

import { initGameSocket } from "./game-socket";

export const initSockets = (httpServer: HTTPServer) => {
  const io = new Server(httpServer);

  io.engine.use(sessionMiddleware);

  io.on("connection", (socket) => {
    // @ts-ignore
    const session = socket.request.session as { id: string; user: User };

    logger.info(`socket for user ${session.user.username} established`);

    socket.join(session.id);
    socket.join(GLOBAL_ROOM);

    // Join game room if gameId provided
    const gameId = socket.handshake.query.gameId as string;
    if (gameId) {
      initGameSocket(socket, parseInt(gameId), session.user.id);
    }

    socket.on("close", () => {
      logger.info(`socket for user ${session.user.username} closed`);
    });
  });

  return io;
};
