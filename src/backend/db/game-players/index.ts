import { User } from "@shared/types";

import db from "../connection";
import { GET_PLAYER_IDS_IN_GAME, GET_PLAYERS_IN_GAME, REMOVE_PLAYER_FROM_GAME } from "./sql";

export const getGamePlayerIds = async (gameId: number) => {
  const result = await db.manyOrNone<{ user_id: number }>(GET_PLAYER_IDS_IN_GAME, [gameId]);
  return result || [];
};

export const getGamePlayers = async (gameId: number) => {
  const result = await db.manyOrNone<User>(GET_PLAYERS_IN_GAME, [gameId]);
  return result || [];
};

export const removePlayerFromGame = async (gameId: number, userId: number) => {
  return await db.none(REMOVE_PLAYER_FROM_GAME, [gameId, userId]);
};
