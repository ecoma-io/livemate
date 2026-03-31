import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { trackRoutes, variantRoutes } from './tracks';

// Mock the drizzle-orm and db schema
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../db/schema', () => ({
  tracks: {},
  variants: {},
}));

describe('tracks router', () => {
  let mockDb: any;
  let app: Hono<any>;

  beforeEach(() => {
    mockDb = {
      query: {
        tracks: {
          findFirst: vi.fn(),
        },
        variants: {
          findFirst: vi.fn(),
        }
      },
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(true),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(true),
    };

    app = new Hono<any>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb);
      c.env = { BUCKET: { delete: vi.fn(), put: vi.fn() } };
      await next();
    });
    app.route('/tracks', trackRoutes);
  });

  it('DELETE /tracks/:id should return 404 if track not found', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue(null);
    const res = await app.request('/tracks/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /tracks/:id should delete track and R2 objects', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue({
      id: '1',
      variants: [{ r2Key: 'test/key' }],
    });
    const res = await app.request('/tracks/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('POST /tracks/:trackId/variants should return 404 if track not found', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue(null);
    const res = await app.request('/tracks/nonexistent/variants', {
      method: 'POST',
      body: new FormData(),
    });
    expect(res.status).toBe(404);
  });

  it('POST /tracks/:trackId/variants should return 400 if bad request', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue({ id: 'track_1' });
    const res = await app.request('/tracks/track_1/variants', {
      method: 'POST',
      body: new FormData(), // empty form data
    });
    expect(res.status).toBe(400);
  });

  it('POST /tracks/:trackId/variants should correctly create variant', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue({ id: 'track_1' });
    mockDb.query.variants.findFirst.mockResolvedValue(null);
    const formData = new FormData();
    const mockBlob = new Blob(['test'], { type: 'audio/mp3' });
    formData.append('file', mockBlob, 'test.mp3');
    formData.append('speed', '1.5');

    const res = await app.request('/tracks/track_1/variants', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(201);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('POST /tracks/:trackId/variants should return 400 if speed is invalid', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue({ id: 'track_1' });
    const formData = new FormData();
    const mockBlob = new Blob(['test'], { type: 'audio/mp3' });
    formData.append('file', mockBlob, 'test.mp3');
    formData.append('speed', '2.0');
    const res = await app.request('/tracks/track_1/variants', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Speed must be');
  });

  it('POST /tracks/:trackId/variants should return 400 if file too large', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue({ id: 'track_1' });
    const formData = new FormData();
    const bigBlob = new Blob([new Uint8Array(3 * 1024 * 1024)], { type: 'audio/mp3' });
    formData.append('file', bigBlob, 'big.mp3');
    formData.append('speed', '1.0');
    const res = await app.request('/tracks/track_1/variants', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('File too large');
  });

  it('POST /tracks/:trackId/variants should replace existing variant', async () => {
    mockDb.query.tracks.findFirst.mockResolvedValue({ id: 'track_1' });
    mockDb.query.variants.findFirst.mockImplementation((options: any) => {
      if (typeof options?.where === 'function') {
        options.where(
          { trackId: 'track_1', speed: 1.5 },
          { and: (a: any, b: any) => a && b, eq: (a: any, b: any) => a === b },
        );
      }
      return Promise.resolve({ id: 'existing_v', r2Key: 'audio/track_1/1.5.mp3' });
    });
    const formData = new FormData();
    const mockBlob = new Blob(['test'], { type: 'audio/mp3' });
    formData.append('file', mockBlob, 'test.mp3');
    formData.append('speed', '1.5');
    const res = await app.request('/tracks/track_1/variants', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(201);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('variants router', () => {
  let mockDb: any;
  let app: Hono<any>;

  beforeEach(() => {
    mockDb = {
      query: {
        variants: {
          findFirst: vi.fn(),
        },
      },
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(true),
    };

    app = new Hono<any>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb);
      c.env = { BUCKET: { delete: vi.fn() } };
      await next();
    });
    app.route('/variants', variantRoutes);
  });

  it('DELETE /variants/:id should return 404 if not found', async () => {
    mockDb.query.variants.findFirst.mockResolvedValue(null);
    const res = await app.request('/variants/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /variants/:id should delete variant', async () => {
    mockDb.query.variants.findFirst.mockResolvedValue({ id: '1', r2Key: 'test' });
    const res = await app.request('/variants/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
