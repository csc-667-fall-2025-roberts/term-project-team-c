import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(
    `INSERT INTO users (id, username, email, password) VALUES (0, 'deck', 'deck@game.com', '1PhyokTFGyKqLe920xQ6cKoJ4EKafRoe')`,
  );
  pgm.sql(
    `INSERT INTO users (id, username, email, password) VALUES (-1, 'discard', 'discard@game.com', '4nNmhqWxTEYTERtZA4VM0fMEwkGho3lo')`,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("DELETE FROM users WHERE id IN (0, -1)");
}
