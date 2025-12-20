export const CREATE_MESSAGE = `
WITH new_message AS (
  INSERT INTO chat_messages (user_id, message, game_id)
  VALUES ($1, $2, $3)
  RETURNING *
)
SELECT
  new_message.*,
  users.username,
  users.email
FROM new_message, users
WHERE new_message.user_id=users.id
`;

export const RECENT_MESSAGES = `
SELECT
  chat_messages.*, users.username, users.email
FROM chat_messages, users
WHERE users.id=chat_messages.user_id
  AND chat_messages.game_id IS NULL
ORDER BY chat_messages.created_at DESC
LIMIT $1
`;

export const RECENT_GAME_MESSAGES = `
SELECT
  chat_messages.*, users.username, users.email
FROM chat_messages, users
WHERE users.id=chat_messages.user_id
  AND chat_messages.game_id=$1
ORDER BY chat_messages.created_at DESC
LIMIT $2
`;
