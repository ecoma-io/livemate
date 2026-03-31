import { Hono } from 'hono';
import type { AppType } from '../types';
import { scripts } from '../db/schema';
import { asc } from 'drizzle-orm';

const app = new Hono<AppType>();

app.get('/', async (c) => {
  const db = c.get('db');

  const allScripts = await db.query.scripts.findMany({
    orderBy: asc(scripts.sortOrder),
    with: {
      tracks: {
        with: {
          variants: true,
        },
      },
    },
  });

  // Build flat variants list for SW caching
  const variants: Array<{
    id: string;
    trackId: string;
    scriptId: string;
    speed: number;
    url: string;
    hash: string;
    size: number;
    mimeType: string;
  }> = [];

  for (const script of allScripts) {
    for (const track of script.tracks) {
      for (const variant of track.variants) {
        variants.push({
          id: variant.id,
          trackId: variant.trackId,
          scriptId: script.id,
          speed: variant.speed,
          url: `/api/audio/${variant.id}`,
          hash: variant.contentHash,
          size: variant.fileSize,
          mimeType: variant.mimeType,
        });
      }
    }
  }

  // Compute overall manifest hash
  const allHashes = variants
    .map((v) => v.hash)
    .sort()
    .join('');
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(allHashes || 'empty'),
  );
  const version = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return c.json({
    version,
    scripts: allScripts.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      sortOrder: g.sortOrder,
    })),
    variants,
  });
});

export { app as manifestRoutes };
