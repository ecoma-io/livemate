import { Hono } from 'hono';
import type { AppType } from '../types';
import { scripts, tracks, variants } from '../db/schema';
import { eq, sql, asc } from 'drizzle-orm';

const ACCEPTED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const app = new Hono<AppType>();

// List all scripts with tracks and variants
app.get('/', async (c) => {
  const db = c.get('db');
  const result = await db.query.scripts.findMany({
    orderBy: asc(scripts.sortOrder),
    with: {
      tracks: {
        with: {
          variants: true,
        },
      },
    },
  });
  return c.json(result);
});

// Create script
app.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json<{ name?: string; color?: string }>();
  const name = body.name?.trim();

  if (!name) {
    return c.json({ error: 'Name is required' }, 400);
  }

  if (name.length > 24) {
    return c.json({ error: 'Name must not exceed 24 characters' }, 400);
  }

  const id = crypto.randomUUID();
  const maxResult = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${scripts.sortOrder}), -1)`,
    })
    .from(scripts);
  const sortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
  const color = body.color || '#8b5cf6';

  await db.insert(scripts).values({ id, name, color, sortOrder });

  return c.json({ id, name, color, sortOrder, tracks: [] }, 201);
});

// Reorder scripts (must be before /:id to avoid route conflict)
app.put('/reorder', async (c) => {
  const db = c.get('db');
  const { items } = await c.req.json<{
    items: { id: string; sortOrder: number }[];
  }>();

  if (!Array.isArray(items)) {
    return c.json({ error: 'Items array required' }, 400);
  }

  for (const item of items) {
    await db
      .update(scripts)
      .set({ sortOrder: item.sortOrder, updatedAt: sql`(datetime('now'))` })
      .where(eq(scripts.id, item.id));
  }

  return c.json({ success: true });
});

// Update script
app.put('/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();
  const body = await c.req.json<{ name?: string; color?: string }>();

  const updates: Record<string, unknown> = {
    updatedAt: sql`(datetime('now'))`,
  };
  if (body.name !== undefined) {
    const trimmedName = body.name.trim();
    if (trimmedName.length > 24) {
      return c.json({ error: 'Name must not exceed 24 characters' }, 400);
    }
    updates.name = trimmedName;
  }
  if (body.color !== undefined) updates.color = body.color;

  await db.update(scripts).set(updates).where(eq(scripts.id, id));

  const script = await db.query.scripts.findFirst({
    where: eq(scripts.id, id),
    with: { tracks: { with: { variants: true } } },
  });

  if (!script) return c.json({ error: 'Not found' }, 404);
  return c.json(script);
});

// Delete script
app.delete('/:id', async (c) => {
  const db = c.get('db');
  const { id } = c.req.param();

  // Get all variants to clean up R2
  const scriptTracks = await db.query.tracks.findMany({
    where: eq(tracks.scriptId, id),
    with: { variants: true },
  });

  for (const track of scriptTracks) {
    for (const variant of track.variants) {
      await c.env.BUCKET.delete(variant.r2Key);
    }
  }

  await db.delete(scripts).where(eq(scripts.id, id));
  return c.body(null, 204);
});

// Upload audio track to script
app.post('/:scriptId/tracks', async (c) => {
  const db = c.get('db');
  const { scriptId } = c.req.param();

  const script = await db.query.scripts.findFirst({
    where: eq(scripts.id, scriptId),
  });
  if (!script) return c.json({ error: 'Script not found' }, 404);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return c.json({ error: 'File is required' }, 400);

  if (!ACCEPTED_AUDIO_TYPES.has(file.type)) {
    return c.json(
      {
        error:
          'Unsupported audio format. Accepted: MP3, M4A, AAC, WAV, OGG, WebM',
      },
      400,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'File too large. Maximum 2MB' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const contentHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const fileId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'mp3';
  const r2Key = `audio/${fileId}/1.0.${ext}`;

  await c.env.BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  });

  await db.insert(tracks).values({
    id: fileId,
    scriptId,
    name: file.name,
  });

  await db.insert(variants).values({
    id: variantId,
    trackId: fileId,
    speed: 1.0,
    r2Key,
    contentHash,
    fileSize: file.size,
    mimeType: file.type,
  });

  return c.json(
    {
      id: fileId,
      scriptId,
      name: file.name,
      variants: [
        {
          id: variantId,
          trackId: fileId,
          speed: 1.0,
          contentHash,
          fileSize: file.size,
          mimeType: file.type,
        },
      ],
    },
    201,
  );
});

export { app as scriptRoutes };
