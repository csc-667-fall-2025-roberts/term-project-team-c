import express from "express";

import { CHAT_LISTING, CHAT_MESSAGE, GLOBAL_ROOM } from "@shared/keys";
import * as Chat from "@backend/db/chat";

const router = express.Router();

// Get lobby chat messages
router.get("/", async (request, response) => {
  response.status(202).send();

  const { id } = request.session;
  const messages = await Chat.list();

  const io = request.app.get("io");
  io.to(id).emit(CHAT_LISTING, { messages });
});

// Get game-specific chat messages
router.get("/:game_id", async (request, response) => {
  response.status(202).send();

  const { id } = request.session;
  const gameId = parseInt(request.params.game_id);
  const messages = await Chat.listForGame(gameId);

  const io = request.app.get("io");
  io.to(id).emit(CHAT_LISTING, { messages });
});

// Post chat message (lobby or game)
router.post("/", async (request, response) => {
  response.status(202).send();

  const { id } = request.session.user!;
  const { message, game_id } = request.body;

  const result = await Chat.create(id, message, game_id);

  const io = request.app.get("io");

  // If it's a game chat message, emit to game room only
  // Otherwise emit to global lobby room
  if (game_id) {
    io.to(`game:${game_id}`).emit(CHAT_MESSAGE, result);
  } else {
    io.to(GLOBAL_ROOM).emit(CHAT_MESSAGE, result);
  }
});

export default router;
