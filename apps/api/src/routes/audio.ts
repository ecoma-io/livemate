import { Hono } from 'hono';
import type { AppType } from '../types';
import { variants } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono<AppType>();

// Serve audio file from R2 via Worker proxy
app.get('/:variantId', async (c) => {
  const db = c.get('db');
  const { variantId } = c.req.param();

  const variant = await db.query.variants.findFirst({
    where: eq(variants.id, variantId),
  });

  if (!variant) return c.notFound();

  const object = await c.env.BUCKET.get(variant.r2Key);
  if (!object) return c.notFound();

  c.header('Content-Type', variant.mimeType);
  c.header('Content-Length', variant.fileSize.toString());
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  c.header('Cross-Origin-Resource-Policy', 'cross-origin');

  return c.body(object.body as ReadableStream);
});

export { app as audioRoutes };
