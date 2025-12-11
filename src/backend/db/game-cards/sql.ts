export const CREATE_DECK = `
  INSERT INTO game_cards (game_id, card_id, user_id, card_order) 
  SELECT $1, cards.id, 0, ROW_NUMBER() OVER (ORDER BY RANDOM())
  FROM cards
`;

export const DRAW_CARDS = `
  SELECT * FROM game_cards
  WHERE game_id=$1 AND user_id=0
  ORDER BY card_order
  LIMIT $2
`;

export const DEAL_CARDS = `
  UPDATE game_cards SET user_id=$1
  WHERE card_id=ANY($2) AND game_id=$3
`;

export const PLAYER_HANDS = `
  SELECT game_cards.*, cards.card_symbol, cards.card_color 
  FROM game_cards, cards
  WHERE game_cards.game_id=$1 AND game_cards.card_id=cards.id
`;

export const INITIAL_DISCARD = `
  WITH picked AS (
    SELECT id
    FROM game_cards
    WHERE game_id = $1 AND user_id = 0
    ORDER BY card_order
    LIMIT 1
  )
  UPDATE game_cards
  SET user_id = -1
  WHERE id IN (SELECT id FROM picked)
`;

export const TOP_DISCARD = `
  SELECT game_cards.*, cards.card_symbol, cards.card_color 
  FROM game_cards, cards
  WHERE game_cards.game_id=$1 AND game_cards.user_id=-1 AND cards.id=game_cards.card_id
`;
