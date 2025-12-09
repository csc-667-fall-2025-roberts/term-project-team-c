export const GET_PLAYER_IDS_IN_GAME = `
  SELECT user_id FROM game_players 
  WHERE game_id=$1
  ORDER BY id
`;

export const GET_PLAYERS_IN_GAME = `
  SELECT users.id, users.username, users.email, users.created_at
  FROM game_players, users
  WHERE game_id=$1 AND users.id=game_players.user_id
  ORDER BY game_players.id
`;
