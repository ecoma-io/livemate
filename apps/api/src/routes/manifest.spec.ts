import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { manifestRoutes } from './manifest';

vi.mock('drizzle-orm', () => ({
  asc: vi.fn(),
}));

vi.mock('../db/schema', () => ({
  scripts: { sortOrder: 'scripts.sortOrder' },
}));

describe('manifest router', () => {
  let mockDb: any;
  let app: Hono<any>;

  beforeEach(() => {
    mockDb = {
      query: {
        scripts: {
          findMany: vi.fn(),
        },
      },
    };

    app = new Hono<any>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb);
      await next();
    });
    app.route('/manifest', manifestRoutes);
  });

  it('GET /manifest should return variants and version', async () => {
    mockDb.query.scripts.findMany.mockResolvedValue([
      {
        id: 'g1',
        name: 'Script 1',
        color: '#fff',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            variants: [
              { id: '1', contentHash: 'abc', speed: 1.0, fileSize: 100, mimeType: 'audio/mp3', trackId: 'f1' },
              { id: '2', contentHash: 'def', speed: 1.5, fileSize: 150, mimeType: 'audio/mp3', trackId: 'f1' },
            ]
          }
        ]
      }
    ]);

    const res = await app.request('/manifest');
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.variants).toHaveLength(2);
    expect(data.variants[0].url).toBe('/api/audio/1');
    expect(data.version).toBeDefined();
    expect(mockDb.query.scripts.findMany).toHaveBeenCalled();
  });

  it('GET /manifest should return stable version when no variants', async () => {
    mockDb.query.scripts.findMany.mockResolvedValue([]);
    const res = await app.request('/manifest');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.variants).toHaveLength(0);
    expect(data.version).toBeDefined();
    expect(data.scripts).toHaveLength(0);
  });
});