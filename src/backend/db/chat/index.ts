import { ChatMessage } from "@shared/types";
import db from "../connection";
import { CREATE_MESSAGE, RECENT_MESSAGES, RECENT_GAME_MESSAGES } from "./sql";

const list = async (limit: number = 50) => {
  return await db.manyOrNone<ChatMessage>(RECENT_MESSAGES, [limit]);
};

const listForGame = async (gameId: number, limit: number = 50) => {
  return await db.manyOrNone<ChatMessage>(RECENT_GAME_MESSAGES, [gameId, limit]);
};

const create = async (user_id: number, message: string, game_id?: number) => {
  return await db.one<ChatMessage>(CREATE_MESSAGE, [user_id, message, game_id || null]);
};

export { create, list, listForGame };
