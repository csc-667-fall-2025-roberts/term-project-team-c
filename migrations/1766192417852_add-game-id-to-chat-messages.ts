import { MigrationBuilder, PgType } from "node-pg-migrate";

const TABLE_NAME = "chat_messages";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn(TABLE_NAME, {
    game_id: {
      type: PgType.INTEGER,
      notNull: false,
      references: "games(id)",
      onDelete: "CASCADE",
    },
  });

  pgm.createIndex(TABLE_NAME, "game_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex(TABLE_NAME, "game_id");
  pgm.dropColumn(TABLE_NAME, "game_id");
}
