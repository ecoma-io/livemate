-- Migration: Add duration to variants
-- Created: 2026-04-04

ALTER TABLE `variants` ADD COLUMN `duration` real;
