import { Game, GameState } from "@shared/types";

import db from "../connection";
import {
  CREATE_GAME,
  GAME_BY_ID,
  GAMES_BY_USER,
  GET_CURRENT_PLAYER,
  GET_GAME_STATE,
  JOIN_GAME,
  LIST_GAMES,
  SET_CURRENT_PLAYER,
  SET_GAME_STATE,
  UPDATE_GAME_STATE,
  SET_WINNER,
  RESET_PENDING_DRAWS,
  ADD_PENDING_DRAWS,
} from "./sql";


export const create = async (user_id: number, name?: string, maxPlayers: number = 4) =>
  await db.one<Game>(CREATE_GAME, [user_id, name, maxPlayers]);

export const join = async (game_id: number, user_id: number) =>
  await db.none(JOIN_GAME, [game_id, user_id]);

export const list = async (state: GameState = GameState.LOBBY, limit: number = 50) =>
  await db.manyOrNone<Game>(LIST_GAMES, [state, limit]);

export const getByUser = async (user_id: number) =>
  await db.manyOrNone<Game>(GAMES_BY_USER, [user_id]);

export const get = async (game_id: number) => await db.one<Game>(GAME_BY_ID, [game_id]);

export const start = async (game_id: number) => await db.none(SET_GAME_STATE, ["active", game_id]);

export const getCurrentPlayer = async (game_id: number) => {
  const result = await db.one<{ current_turn_user_id: number }>(GET_CURRENT_PLAYER, [game_id]);
  return result.current_turn_user_id;
};

export const setCurrentPlayer = async (game_id: number, user_id: number) =>
  await db.none(SET_CURRENT_PLAYER, [user_id, game_id]);

export const getGameState = async (game_id: number) =>
  await db.one<{ active_color: string | null; pending_draw_count: number; play_direction: number; winner_id: number | null, state: string; }>(
    GET_GAME_STATE,
    [game_id]
  );

export const updateGameState = async (
  game_id: number,
  active_color: string | null,
  pending_draw_count: number,
  play_direction: number;
) => await db.none(UPDATE_GAME_STATE, [active_color, pending_draw_count, play_direction, game_id]);

export const resetPendingDraws = async (game_id: number) =>
  await db.none(RESET_PENDING_DRAWS, [game_id]);

export const addPendingDraws = async (game_id: number, count: number) =>
  await db.none(ADD_PENDING_DRAWS, [count, game_id]);

export const setWinner = async (gameId: number, userId: number) =>
  await db.none(SET_WINNER, [gameId, userId]);
