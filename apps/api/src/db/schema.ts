import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

export const scripts = sqliteTable('scripts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#8b5cf6'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  scriptId: text('script_id')
    .notNull()
    .references(() => scripts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const variants = sqliteTable(
  'variants',
  {
    id: text('id').primaryKey(),
    trackId: text('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    speed: real('speed').notNull(),
    r2Key: text('r2_key').notNull(),
    contentHash: text('content_hash').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('unique_track_speed').on(table.trackId, table.speed),
  ],
);

export const scriptsRelations = relations(scripts, ({ many }) => ({
  tracks: many(tracks),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  script: one(scripts, {
    fields: [tracks.scriptId],
    references: [scripts.id],
  }),
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  track: one(tracks, {
    fields: [variants.trackId],
    references: [tracks.id],
  }),
}));
