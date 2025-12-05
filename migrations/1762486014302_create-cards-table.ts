import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create color enum
  pgm.createType('colors', ['blue', 'yellow', 'green', 'red', 'black']);

  // Create symbols enum
  pgm.createType('symbols', [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'skip', 'swap', 'plus_two', 'plus_four', 'wildcard',
  ]);

  // Create cards table
  pgm.createTable('cards', {
    id: 'id',
    card_symbol: {
      type: 'symbols',
      notNull: true,
      comment: 'Card symbol enum',
    },
    card_color: {
      type: 'colors',
      notNull: true,
      comment: 'Card color enum',
    },
  });

  // Insert all valid card combinations
  const colors = ['blue', 'yellow', 'green', 'red'];
  const symbols = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'skip', 'swap', 'plus_two'];

  // Number and action cards (0-9, skip, swap, +2) in each color, 0 once per color, 1-9 and actions twice
  for (const color of colors) {
    // Zero card (one per color)
    pgm.sql(`INSERT INTO cards (card_symbol, card_color) VALUES ('zero', '${color}')`);

    // Number cards 1-9 and action cards (two of each)
    for (const symbol of symbols.slice(1)) {
      pgm.sql(`INSERT INTO cards (card_symbol, card_color) VALUES ('${symbol}', '${color}')`);
      pgm.sql(`INSERT INTO cards (card_symbol, card_color) VALUES ('${symbol}', '${color}')`);
    }
  }

  // Wild and +4 cards (4 of each, black color)
  for (let i = 0; i < 4; i++) {
    pgm.sql(`INSERT INTO cards (card_symbol, card_color) VALUES ('wildcard', 'black')`);
    pgm.sql(`INSERT INTO cards (card_symbol, card_color) VALUES ('plus_four', 'black')`);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('cards');
  pgm.dropType('symbols');
  pgm.dropType('colors');
}
