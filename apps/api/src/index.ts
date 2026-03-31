import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb } from './db';
import { scriptRoutes } from './routes/scripts';
import { trackRoutes, variantRoutes } from './routes/tracks';
import { audioRoutes } from './routes/audio';
import { manifestRoutes } from './routes/manifest';
import { cleanOrphanedFiles } from './cron';
import type { Env, AppType } from './types';

const app = new Hono<AppType>().basePath('/api');

// CORS middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (origin.includes(':18180') || origin.includes('livemate.ecoma.io')) {
        return origin;
      }
      return 'https://livemate.ecoma.io';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

// CORP header for COEP compatibility (ffmpeg.wasm SharedArrayBuffer)
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
});

// Drizzle DB middleware
app.use('*', async (c, next) => {
  c.set('db', createDb(c.env.DB));
  await next();
});

app.get('/', (c) => c.text('LiveMate API'));

// Routes
app.route('/scripts', scriptRoutes);
app.route('/tracks', trackRoutes);
app.route('/variants', variantRoutes);
app.route('/audio', audioRoutes);
app.route('/manifest', manifestRoutes);

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    app.fetch(request, env, ctx),
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const db = createDb(env.DB);
    ctx.waitUntil(cleanOrphanedFiles(db, env.BUCKET));
  },
};
