-- Migration: Initial schema
-- Created: 2026-04-01

CREATE TABLE `scripts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `color` text NOT NULL DEFAULT '#8b5cf6',
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE `tracks` (
  `id` text PRIMARY KEY NOT NULL,
  `script_id` text NOT NULL REFERENCES `scripts`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE `variants` (
  `id` text PRIMARY KEY NOT NULL,
  `track_id` text NOT NULL REFERENCES `tracks`(`id`) ON DELETE CASCADE,
  `speed` real NOT NULL,
  `r2_key` text NOT NULL,
  `content_hash` text NOT NULL,
  `file_size` integer NOT NULL,
  `mime_type` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX `unique_track_speed` ON `variants` (`track_id`, `speed`);
