import express from "express";
import { Server } from "socket.io";

import * as Games from "@backend/db/games";
import { generateGameName } from "@backend/lib/game-names";
import logger from "@backend/lib/logger";
import * as GameService from "@backend/services/game-service";
import { broadcastGameState } from "@backend/sockets/game-socket";
import { GAME_CREATE, GAME_LISTING } from "@shared/keys";

const router = express.Router();

router.get("/", async (request, response) => {
  const sessionId = request.session.id;
  const userId = request.session.user!.id;

  response.status(202).send();

  const allGames = await Games.list();
  const userGames = await Games.getByUser(userId);

  // Separate games into user's games and available games
  const userGameIds = new Set(userGames.map((g) => g.id));
  const myGames = allGames.filter((g) => userGameIds.has(g.id));
  const availableGames = allGames.filter((g) => !userGameIds.has(g.id));

  const io = request.app.get("io") as Server;

  io.to(sessionId).emit(GAME_LISTING, { myGames, availableGames });
});

router.post("/", async (request, response) => {
  try {
    const { id } = request.session.user!;
    const { max_players } = request.body;
    // Generate random name if not provided (e.g., "brave-green-dolphin")
    const name = request.body.name?.trim() || generateGameName();

    logger.info(`Create game request ${name}, ${max_players} by ${id}`);
    const game = await Games.create(id, name, max_players);

    // Add creator as first player
    await Games.join(game.id, id);
    logger.info(`Game created: ${game.id}`);

    const io = request.app.get("io") as Server;
    io.emit(GAME_CREATE, { ...game });

    response.redirect(`/games/${game.id}`);
  } catch (error: any) {
    logger.error("Error creating game:", error);
    response.redirect("/lobby");
  }
});

router.get("/:id", async (request, response) => {
  const gameId = parseInt(request.params.id);
  const currentUserId = request.session.user!.id;

  const game = await Games.get(gameId);

  // Get the top discard card if the game has started
  let topCard = null;
  if (game.state === 'active') {
    const gameState = await GameService.get(gameId);
    const topDiscardCards = gameState.topDiscardCard;
    if (topDiscardCards && topDiscardCards.length > 0) {
      // Cards are ordered DESC, so first element is the top card
      topCard = topDiscardCards[0];
    }
  }

  response.render("games/game", {
    ...game,
    currentUserId,
    topCard,
  });
});

router.post("/:game_id/join", async (request, response) => {
  const { id } = request.session.user!;
  const { game_id } = request.params;

  await Games.join(parseInt(game_id), id);

  response.redirect(`/games/${game_id}`);
});

router.post("/:game_id/start", async (request, response) => {
	console.log("Starting the game");
  const { game_id } = request.params;
  const gameId = parseInt(game_id);

  await GameService.start(gameId);

  const state = await GameService.get(gameId);

  response.redirect(`/games/${gameId}`);

  const io = request.app.get("io") as Server;
  broadcastGameState(io, gameId, state);
});

export default router;
