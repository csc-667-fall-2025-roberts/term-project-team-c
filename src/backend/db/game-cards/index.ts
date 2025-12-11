import { DisplayGameCard, GameCard } from "@shared/types";

import db from "../connection";
import {
  CREATE_DECK,
  DEAL_CARDS,
  DRAW_CARDS,
  INITIAL_DISCARD,
  PLAYER_HANDS,
  TOP_DISCARD,
} from "./sql";

export const createDeck = async (gameId: number) => {
  await db.none(CREATE_DECK, [gameId]);
};

export const drawCards = async (gameId: number, limit: number) => {
  return await db.many<GameCard>(DRAW_CARDS, [gameId, limit]);
};

export const dealCards = async (gameId: number, userId: number, cardIds: number[]) => {
  await db.none(DEAL_CARDS, [userId, cardIds, gameId]);
};

export const playerHands = async (gameId: number) => {
  return (await db.many<DisplayGameCard>(PLAYER_HANDS, [gameId])).reduce(
    (memo, card) => {
      if (card.user_id < 1) {
        return memo;
      }

      memo[card.user_id] = [...(memo[card.user_id] || []), card];

      return memo;
    },
    {} as Record<number, DisplayGameCard[]>,
  );
};

export const setInitialDiscard = async (gameId: number) => await db.none(INITIAL_DISCARD, [gameId]);

export const getTopDiscard = async (gameId: number) =>
  await db.any<DisplayGameCard>(TOP_DISCARD, [gameId]);
