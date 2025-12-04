// ============ User Types ============
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: Date;
}

export interface SecureUser extends User {
  password: string;
}

// ============ Chat Types ============
export interface DbChatMessage {
  id: number;
  user_id: number;
  message: string;
  created_at: Date;
}

export interface ChatMessage extends DbChatMessage {
  username: string;
  email: string;
}

// ============ Card Types ============
export enum CardColor {
  BLUE = "blue",
  YELLOW = "yellow",
  GREEN = "green",
  RED = "red",
  BLACK = "black",
}

export enum CardSymbol {
  ZERO = "zero",
  ONE = "one",
  TWO = "two",
  THREE = "three",
  FOUR = "four",
  FIVE = "five",
  SIX = "six",
  SEVEN = "seven",
  EIGHT = "eight",
  NINE = "nine",
  SKIP = "skip",
  SWAP = "swap",
  PLUS_TWO = "plus_two",
  PLUS_FOUR = "plus_four",
  WILDCARD = "wildcard",
}

export interface Card {
  id: number;
  card_symbol: CardSymbol | string;
  card_color: CardColor | string;
}

export interface GameCard {
  id: number;
  game_id: number;
  user_id: number;
  card_id: number;
  card_order: number;
  card?: Card; // Full card details when joined
}

// ============ Game Types ============
export type GameUser = {
  id: number;
  game_id: number;
  user_id: number;
  turn_order: number;
  is_host: boolean;
  joined_at: Date;
};

export type Game = {
  id: number;
  status: boolean; // true = active, false = completed
  player_turn: number; // Current player user_id
  is_clockwise: boolean;
  last_card_played?: number; // Card ID
  created_at: Date;
  updated_at: Date;
  players?: GameUser[];
};

export interface UnoGameAction {
  id: number;
  game_id: number;
  user_id: number;
  action_type: string;
  card_played_id?: number;
  declared_color?: string;
  cards_drawn?: number;
  created_at: Date;
}
