import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { audioRoutes } from './audio';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('../db/schema', () => ({
  variants: {},
}));

describe('audio router', () => {
  let mockDb: any;
  let app: Hono<any>;
  let mockBucket: any;

  beforeEach(() => {
    mockDb = {
      query: {
        variants: {
          findFirst: vi.fn(),
        },
      },
    };
    mockBucket = {
      get: vi.fn(),
    };

    app = new Hono<any>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb);
      c.env = { BUCKET: mockBucket };
      await next();
    });
    app.route('/', audioRoutes);
  });

  it('GET /:variantId should return 404 if variant not in DB', async () => {
    mockDb.query.variants.findFirst.mockResolvedValue(null);
    const res = await app.request('/1');
    expect(res.status).toBe(404);
  });

  it('GET /:variantId should return 404 if object not in bucket', async () => {
    mockDb.query.variants.findFirst.mockResolvedValue({
      r2Key: 'test/key',
      mimeType: 'audio/mp3',
      fileSize: 100,
    });
    mockBucket.get.mockResolvedValue(null);

    const res = await app.request('/1');
    expect(res.status).toBe(404);
  });

  it('GET /:variantId should return file stream', async () => {
    mockDb.query.variants.findFirst.mockResolvedValue({
      r2Key: 'test/key',
      mimeType: 'audio/mp3',
      fileSize: 100,
    });
    mockBucket.get.mockResolvedValue({ body: 'stream_mock' });

    const res = await app.request('/1');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mp3');
  });
});