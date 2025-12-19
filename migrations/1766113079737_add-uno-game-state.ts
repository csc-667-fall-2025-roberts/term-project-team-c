import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create enum for card colors (including black for wilds)
  pgm.createType('card_color_choice', ['red', 'blue', 'green', 'yellow']);
  
  // Add UNO-specific game state columns
  pgm.addColumns('games', {
    active_color: {
      type: 'card_color_choice',
      comment: 'Current active color (for wild cards)',
    },
    pending_draw_count: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of cards to be drawn (for +2/+4 stacking)',
    },
    play_direction: {
      type: 'integer',
      notNull: true,
      default: 1,
      comment: '1 for clockwise, -1 for counter-clockwise',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('games', [
    'active_color',
    'pending_draw_count',
    'play_direction',
  ]);
  pgm.dropType('card_color_choice');
}
