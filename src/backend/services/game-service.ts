import * as GameCards from "../db/game-cards";
import * as GamePlayers from "../db/game-players";
import * as Games from "../db/games";

/**
 * Validate if a card can be played with UNO rules
 */
function validateCardPlay(
  cardToPlay: any,
  topCard: any,
  activeColor: string | null,
  pendingDrawCount: number,
): boolean {
  const playedSymbol = cardToPlay.card_symbol;
  const playedColor = cardToPlay.card_color;
  const topSymbol = topCard.card_symbol;

  // Use activeColor if set (from wild cards), otherwise use top card's color
  const effectiveColor = activeColor || topCard.card_color;

  // Must counter draw cards with draw cards
  if (pendingDrawCount > 0) {
    return playedSymbol === "plus_two" || playedSymbol === "plus_four";
  }

  // Wild cards can always be played
  if(playedSymbol === "wildcard" || playedSymbol === "plus_four") {
    return true;
  }

  // Regular cards: match color OR symbol
  return playedColor === effectiveColor || playedSymbol === topSymbol;
}

/**
 * Determines game state changes based on the card played
 */
function calculateCardEffects(
  cardSymbol: string,
  cardColor: string, // [FIX] Added cardColor param
  chosenColor: string | null,
  currentPendingDraws: number,
) {
  let activeColor: string | null = null;
  let pendingDrawCount = currentPendingDraws;
  let directionMultiplier = 1; // 1 for clockwise, -1 for counter-clockwise
  let skipCount = 0;

  switch (cardSymbol) {
    case 'plus_two':
      pendingDrawCount += 2;
      activeColor = cardColor; // [FIX] Set to card color instead of null
      break;
    case 'plus_four':
      pendingDrawCount += 4;
      activeColor = chosenColor;
      if(!activeColor) throw new Error("Must choose a color for Wild +4");
      break;
    case 'wildcard':
      activeColor = chosenColor;
      if(!activeColor) throw new Error("Must choose a color for Wildcard");
      pendingDrawCount = 0; // Reset stacking
      break;
    case 'skip':
      skipCount = 1;
      pendingDrawCount = 0;
      activeColor = cardColor; // [FIX] Set to card color instead of null
      break;
    case 'swap':
      directionMultiplier = -1;
      pendingDrawCount = 0;
      activeColor = cardColor; // [FIX] Set to card color instead of null
      break;
    default:
      // Number cards reset pending draws and active color
      pendingDrawCount = 0;
      activeColor = cardColor; // [FIX] Set to card color instead of null
      break;
  }

  return { activeColor, pendingDrawCount, directionMultiplier, skipCount };
};

/**
 * Calculates the next player's index based on direction and skips
 */
function calculateNextPlayer(
  currentIndex: number,
  playerCount: number,
  direction: number,
  skipCount: number,
): number {
  const moves = 1 + skipCount;
  let nextIndex = currentIndex + (moves * direction);
  while(nextIndex < 0) nextIndex += playerCount;
  nextIndex = nextIndex % playerCount;
  return nextIndex;
}
export const start = async (gameId: number) => {
  // Created deck
  await GameCards.createDeck(gameId);

  // Get all the players in the game
  const playerIds = await GamePlayers.getGamePlayerIds(gameId);

  // Get (#players * 7) cards to deal
  const cardsToDeal = await GameCards.drawCards(gameId, playerIds.length * 7);

  // Iterate over players and assign cards
  for (let i = 0; i < playerIds.length; i++) {
    const playerCards = cardsToDeal.slice(i * 7, (i + 1) * 7).map(({ card_id }) => card_id);

    await GameCards.dealCards(gameId, playerIds[i].user_id, playerCards);
  }

  await GameCards.setInitialDiscard(gameId);

  // Update game state to active
  await Games.start(gameId);

  // Set the first player's turn
  const firstPlayerId = playerIds[0].user_id;
  await Games.setCurrentPlayer(gameId, firstPlayerId);

  return { nextPlayer: firstPlayerId };
};


export const get = async (gameId: number) => {
  // player hands
  const playerHands = await GameCards.playerHands(gameId);

  const currentPlayer = await Games.getCurrentPlayer(gameId);

  const players = await GamePlayers.getGamePlayers(gameId);

  const topDiscardCard = await GameCards.getTopDiscard(gameId);

  const gameState = await Games.getGameState(gameId);

  return {
    playerHands,
    currentPlayer, // games.current_turn_user_id
    players, // user_id, username, cardCount
    topDiscardCard, // game_cards where user_id = -1
    activeColor: gameState.active_color, // Current active color for wild cards
    pendingDrawCount: gameState.pending_draw_count, // Cards to be drawn
    playDirection: gameState.play_direction, // 1 for clockwise, -1 for counter-clockwise
    winnerId: gameState.winner_id,
    state: gameState.state, 
  };
};

export const playCard = async (
  gameId: number,
  userId: number,
  cardId: number,
  chosenColor?: string
) => {
  const gameStateBefore = await Games.getGameState(gameId);
  if (gameStateBefore.winner_id !== null) {
    logger.info(
      `User ${userId} tried to play in finished game ${gameId} (winner=${gameStateBefore.winner_id})`,
    );
    throw new Error("Game is already over");
  }
  // Validate it's the player's turn
  const currentPlayerId = await Games.getCurrentPlayer(gameId);
  if (currentPlayerId !== userId) {
    throw new Error("Not your turn");
  }

  // Get player's hand and find the card
  const playerHands = await GameCards.playerHands(gameId);
  const cardToPlay = playerHands[userId]?.find(c => c.id === cardId);
  if (!cardToPlay) {
    throw new Error("Card not in your hand"); 
  }

  // Get the top discard card and game state
  const topDiscardCards = await GameCards.getTopDiscard(gameId);
  const topCard = topDiscardCards[0]; // Cards ordered DESC, first is newest
  const gameState = await Games.getGameState(gameId);

  // Validate the card can be played
  const isValid = validateCardPlay(
    cardToPlay,
    topCard,
    gameState.active_color,
    gameState.pending_draw_count,
  );
  if (!isValid) {
    const debugInfo = {
      playedCard: `${cardToPlay.card_color} ${cardToPlay.card_symbol}`,
      topCard: `${topCard.card_color} ${topCard.card_symbol}`,
      activeColor: gameState.active_color,
      pendingDrawCount: gameState.pending_draw_count,
    };
    console.error("Card validation failed:", debugInfo);
    throw new Error(`Invalid card play: Cannot play ${debugInfo.playedCard} on ${debugInfo.topCard} (activeColor: ${debugInfo.activeColor})`);
  }

  // Move card to discard pile
  await GameCards.moveCardToDiscard(cardId, gameId, userId);

  // Calculate effects of the played card
  const effects = calculateCardEffects(
    cardToPlay.card_symbol,
    cardToPlay.card_color, // [FIX] Passed card color
    chosenColor || null,
    gameState.pending_draw_count,
  );

  const updatedHands = await GameCards.playerHands(gameId);
  const remainingCards = updatedHands[userId] || [];

  if (remainingCards.length === 0) {
    await Games.setWinner(gameId, userId);

    logger.info(`Game ${gameId} has ended. Winner user_id=${userId}`);

    return {
      success: true,
      gameOver: true,
      winnerId: userId,
      activeColor: effects.activeColor,
      pendingDrawCount: effects.pendingDrawCount,
    };
  }

  // Update game state
  const newDirection = gameState.play_direction * effects.directionMultiplier;
  await Games.updateGameState(
    gameId,
    effects.activeColor,
    effects.pendingDrawCount,
    newDirection,
  );

  // Calculate and set next player
  const playerIds = await GamePlayers.getGamePlayerIds(gameId);
  const currentIndex = playerIds.findIndex(p => p.user_id === userId);
  const reverse = playerIds.length === 2 && cardToPlay.card_symbol === "swap";

  const realSkipCount = reverse ? 1 : effects.skipCount;

  const nextIndex = calculateNextPlayer(
    currentIndex,
    playerIds.length,
    newDirection,
    realSkipCount,
  );

  const nextPlayerId = playerIds[nextIndex].user_id;

  await Games.setCurrentPlayer(gameId, nextPlayerId);

  return {
    success: true,
    gameOver: false,
    nextPlayerId,
    activeColor: effects.activeColor,
    pendingDrawCount: effects.pendingDrawCount,
  };
};


export const drawCard = async (gameId: number, userId: number) => {
  // Validate it's the player's turn
  const currentPlayer = await Games.getCurrentPlayer(gameId);
  if (currentPlayer !== userId) {
    throw new Error("Not your turn");
  }

  // Check pending draws
  const gameState = await Games.getGameState(gameId);
  const cardsToDraw = gameState.pending_draw_count > 0
    ? gameState.pending_draw_count
    : 1;

    // Draw cards
    const cards = await GameCards.drawCards(gameId, cardsToDraw);
    if(!cards || cards.length === 0) {
      throw new Error("No cards left in deck");
    }

    // Add to player's hand
    const cardIds = cards.map(c => c.card_id);
    await GameCards.dealCards(gameId, userId, cardIds);

    // Reset pending draws if any
    if (gameState.pending_draw_count > 0) {
      await Games.resetPendingDraws(gameId);
    }

    // Advance to next player
    const playerIds = await GamePlayers.getGamePlayerIds(gameId);
    const currentIndex = playerIds.findIndex(p => p.user_id === userId);
    const nextIndex = calculateNextPlayer(
      currentIndex,
      playerIds.length,
      gameState.play_direction,
      0, // no skip on draw
    );
    const nextPlayerId = playerIds[nextIndex].user_id;

    await Games.setCurrentPlayer(gameId, nextPlayerId);
    return {
      drawnCards: cards,
      count: cardsToDraw,
      nextPlayerId,
    };
}