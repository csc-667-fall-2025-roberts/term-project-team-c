import { Server, Socket } from "socket.io";

import { GAME_UPDATED } from "@shared/keys";
import { DisplayGameCard, User } from "@shared/types";

import * as GamePlayers from "../db/game-players";

const getGameRoom = (gameId: number) => `game:${gameId}`;
const getPlayerRoom = (gameId: number, userId: number) => `${getGameRoom(gameId)}:${userId}`;

export const initGameSocket = async (socket: Socket, gameId: number, userId: number) => {
  const playerIds = (await GamePlayers.getGamePlayerIds(gameId)).map(({ user_id }) => user_id);
  if (!playerIds.includes(userId)) {
    console.log(`User ${userId} tried to join game ${gameId} socket without being a player`);
    return;
  }

  socket.join(getGameRoom(gameId));
  socket.join(getPlayerRoom(gameId, userId));
};

export const broadcastGameState = (
  io: Server,
  gameId: number,
  state: {
    playerHands: Record<number, DisplayGameCard[]>;
    currentPlayer: number;
    players: User[];
    topDiscardCard: DisplayGameCard[];
  },
) => {
  Object.entries(state.playerHands).forEach((element) => {
    io.to(getPlayerRoom(gameId, parseInt(element[0]))).emit("game:player-hand", element[1]);
  });

  io.to(getGameRoom(gameId)).emit(GAME_UPDATED, state);
};
