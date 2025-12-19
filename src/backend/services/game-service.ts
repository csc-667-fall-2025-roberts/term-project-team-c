import * as GameCards from "../db/game-cards";
import * as GamePlayers from "../db/game-players";
import * as Games from "../db/games";

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

  return {
    playerHands,
    currentPlayer, // games.current_turn_user_id
    players, // user_id, username, cardCount
    topDiscardCard, // game_cards where card_order = -1
    // playDirection // not sure if this is stored anywhere currently
  };
};

export const playCard = async (gameId: number, userId: number, cardId: number) => {
  // 1. Verify it's the player's turn
  const currentPlayer = await Games.getCurrentPlayer(gameId);
  if (currentPlayer !== userId) {
    throw new Error("Not your turn");
  }

  // 2. Move the card from player's hand to discard pile
  const movedCard = await GameCards.moveCardToDiscard(cardId, gameId, userId);
  
  if (!movedCard) {
    throw new Error("Card not found or doesn't belong to player");
  }

  // 3. Get all players to determine next turn
  const playerIds = await GamePlayers.getGamePlayerIds(gameId);
  const currentPlayerIndex = playerIds.findIndex(p => p.user_id === userId);
  const nextPlayerIndex = (currentPlayerIndex + 1) % playerIds.length;
  const nextPlayerId = playerIds[nextPlayerIndex].user_id;

  // 4. Update the current turn to next player
  await Games.setCurrentPlayer(gameId, nextPlayerId);

  return { movedCard, nextPlayerId };
};


export const drawCard = async (gameId: number, userId: number) => {
  //Draw one card from the deck
  const cards = await GameCards.drawCards(gameId, 1);

  if (!cards || cards.length === 0) {
    throw new Error("No cards left in deck");
  }

  const drawnCard = cards[0];

  //Add the card to the player's hand
  await GameCards.dealCards(gameId, userId, [drawnCard.card_id]);

  return drawnCard;
};
