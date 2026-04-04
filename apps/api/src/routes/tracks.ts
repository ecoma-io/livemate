import { Hono } from 'hono';
import type { AppType } from '../types';
import { tracks, variants } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const VALID_SPEEDS = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5];

const trackApp = new Hono<AppType>();

// Update track name
trackApp.put('/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();

  if (!name) return c.json({ error: 'Name is required' }, 400);

  const track = await db.query.tracks.findFirst({
    where: eq(tracks.id, id),
    with: { variants: true },
  });
  if (!track) return c.json({ error: 'Not found' }, 404);

  await db
    .update(tracks)
    .set({ name, updatedAt: sql`(datetime('now'))` })
    .where(eq(tracks.id, id));

  return c.json({ ...track, name });
});

// Delete track
trackApp.delete('/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const track = await db.query.tracks.findFirst({
    where: eq(tracks.id, id),
    with: { variants: true },
  });

  if (!track) return c.json({ error: 'Not found' }, 404);

  for (const variant of track.variants) {
    await c.env.BUCKET.delete(variant.r2Key);
  }

  await db.delete(tracks).where(eq(tracks.id, id));
  return c.body(null, 204);
});

// Upload variant for a track
trackApp.post('/:trackId/variants', async (c) => {
  const db = c.get('db');
  const { trackId } = c.req.param();

  const track = await db.query.tracks.findFirst({
    where: eq(tracks.id, trackId),
  });
  if (!track) return c.json({ error: 'Track not found' }, 404);

  const formData = await c.req.formData();
  const audioFile = formData.get('file') as File | null;
  const speed = parseFloat(formData.get('speed') as string);

  if (!audioFile) return c.json({ error: 'File is required' }, 400);
  if (isNaN(speed) || !VALID_SPEEDS.includes(speed)) {
    return c.json(
      { error: 'Speed must be 1.0, 1.1, 1.2, 1.3, 1.4, or 1.5' },
      400,
    );
  }

  if (audioFile.size > MAX_FILE_SIZE) {
    return c.json({ error: 'File too large. Maximum 2MB' }, 400);
  }

  // Check if variant already exists and replace it
  const existing = await db.query.variants.findFirst({
    where: (v, { and, eq: eq_ }) =>
      and(eq_(v.trackId, trackId), eq_(v.speed, speed)),
  });

  if (existing) {
    await c.env.BUCKET.delete(existing.r2Key);
    await db.delete(variants).where(eq(variants.id, existing.id));
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const contentHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const variantId = crypto.randomUUID();
  const r2Key = `audio/${trackId}/${speed}.mp3`;

  const durationRaw = parseFloat(formData.get('duration') as string);
  const duration = isNaN(durationRaw) ? null : durationRaw;

  await c.env.BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: 'audio/mpeg' },
  });

  await db.insert(variants).values({
    id: variantId,
    trackId,
    speed,
    r2Key,
    contentHash,
    fileSize: audioFile.size,
    mimeType: 'audio/mpeg',
    duration,
  });

  return c.json(
    {
      id: variantId,
      trackId,
      speed,
      contentHash,
      fileSize: audioFile.size,
      mimeType: 'audio/mpeg',
      duration,
    },
    201,
  );
});

// Variant routes (mounted separately at /variants)
const variantApp = new Hono<AppType>();

variantApp.delete('/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  const variant = await db.query.variants.findFirst({
    where: eq(variants.id, id),
  });

  if (!variant) return c.json({ error: 'Not found' }, 404);

  await c.env.BUCKET.delete(variant.r2Key);
  await db.delete(variants).where(eq(variants.id, id));
  return c.body(null, 204);
});

export { trackApp as trackRoutes, variantApp as variantRoutes };
