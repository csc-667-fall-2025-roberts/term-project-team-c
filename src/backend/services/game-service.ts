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

  // Do we return here or write another function to get game states
  return { nextPlayer: playerIds[0] };
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

};

export const drawCard = async (gameId: number, userId: number) => {

};
