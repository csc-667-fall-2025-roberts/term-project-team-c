import { Server, Socket } from "socket.io";

import { GAME_DRAW_CARD, GAME_PLAY_CARD, GAME_UPDATED } from "@shared/keys";
import { DisplayGameCard, User } from "@shared/types";

import * as GamePlayers from "../db/game-players";
import * as GameService from "../services/game-service";
import logger from "../lib/logger";

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
  
  // Send initial game state when player connects
  try {
    const gameState = await GameService.get(gameId);
    socket.emit("game:player-hand", gameState.playerHands[userId] || []);
    socket.emit(GAME_UPDATED, gameState);
  } catch (error) {
    logger.error(`Error sending initial game state: ${error}`);
  }
};


export const broadcastGameState = (
  io: Server,
  gameId: number,
  state: {
    playerHands: Record<number, DisplayGameCard[]>;
    currentPlayer: number;
    players: User[];
    topDiscardCard: DisplayGameCard[];
    activeColor?: string | null;
    pendingDrawCount?: number;
    playDirection?: number;
  },
) => {
  Object.entries(state.playerHands).forEach((element) => {
    io.to(getPlayerRoom(gameId, parseInt(element[0]))).emit("game:player-hand", element[1]);
  });

  io.to(getGameRoom(gameId)).emit(GAME_UPDATED, state);
};

export const registerGameHandlers = (io: Server, socket: Socket, gameId: number, userId: number) => {
    // Handle play card event
  socket.on(GAME_PLAY_CARD, async ({ cardId, chosenColor }: { cardId: number; chosenColor?: string }) => {
    try {
      logger.info(`User ${userId} playing card ${cardId} in game ${gameId}${chosenColor ? ` with color ${chosenColor}` : ''}`);
      
      // Call the service to play the card with optional color
      await GameService.playCard(gameId, userId, cardId, chosenColor);
      
      // Get updated game state
      const gameState = await GameService.get(gameId);
      
      // Broadcast to all players
      broadcastGameState(io, gameId, gameState);
    } catch (error) {
      logger.error(`Error playing card: ${error}`);
      socket.emit("game:error", { message: error instanceof Error ? error.message : "Failed to play card" });
    }
  });


  // Handle draw card event
  socket.on(GAME_DRAW_CARD, async () => {
    try {
      logger.info(`User ${userId} drawing card in game ${gameId}`);

      // Call the service to draw a card
      await GameService.drawCard(gameId, userId);

      // Get updated game state
      const gameState = await GameService.get(gameId);

      // Broadcast to all players
      broadcastGameState(io, gameId, gameState);
    } catch (error) {
      logger.error(`Error drawing card: ${error}`);
      socket.emit("game:error", { message: error instanceof Error ? error.message : "Failed to draw card" });
    }
  });

  // Handle pass turn event
  socket.on("game:pass-turn", async () => {
    try {
      logger.info(`User ${userId} passing turn in game ${gameId}`);

      // Call the service to pass the turn
      await GameService.passTurn(gameId, userId);

      // Get updated game state
      const gameState = await GameService.get(gameId);

      // Broadcast to all players
      broadcastGameState(io, gameId, gameState);
    } catch (error) {
      logger.error(`Error passing turn: ${error}`);
      socket.emit("game:error", { message: error instanceof Error ? error.message : "Failed to pass turn" });
    }
  });
};
