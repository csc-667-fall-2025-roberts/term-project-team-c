import { User } from "@shared/types";

import db from "../connection";
import { GET_PLAYER_IDS_IN_GAME, GET_PLAYERS_IN_GAME } from "./sql";

export const getGamePlayerIds = async (gameId: number) => {
  return await db.many<{ user_id: number }>(GET_PLAYER_IDS_IN_GAME, [gameId]);
};

export const getGamePlayers = async (gameId: number) => {
  return await db.many<User>(GET_PLAYERS_IN_GAME, [gameId]);
};
