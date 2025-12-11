import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Tracks which card instance belongs to whom in each game
  pgm.createTable("game_cards", {
    id: "id",
    game_id: {
      type: "integer",
      notNull: true,
      references: "games(id)",
      onDelete: "CASCADE",
    },
    user_id: {
      type: "integer",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    card_id: {
      type: "integer",
      notNull: true,
      references: "cards(id)",
      onDelete: "CASCADE",
      comment: "Reference to the card",
    },
    card_order: {
      type: "integer",
      notNull: true,
      comment: "Position in player hand (for ordering)",
    },
  });

  // Indexes for quick lookups
  pgm.createIndex("game_cards", "game_id");
  pgm.createIndex("game_cards", ["game_id", "user_id"]);
  pgm.createIndex("game_cards", ["game_id", "user_id", "card_order"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("game_cards");
}
