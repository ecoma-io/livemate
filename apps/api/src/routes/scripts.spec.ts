import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { scriptRoutes } from './scripts';

// Mock the drizzle-orm and db schema
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('../db/schema', () => ({
  scripts: { id: 'scripts.id', sortOrder: 'scripts.sortOrder' },
  tracks: {},
  variants: {},
}));

describe('scripts router', () => {
  let mockDb: any;
  let app: Hono<any>;

  beforeEach(() => {
    mockDb = {
      query: {
        scripts: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: '1', name: 'Test Script', sortOrder: 0 },
            ]),
          findFirst: vi.fn(),
        },
        tracks: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockResolvedValue([{ maxOrder: 0 }]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockReturnThis(),
    };

    app = new Hono<any>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb);
      c.env = { BUCKET: { delete: vi.fn(), put: vi.fn() } };
      await next();
    });
    app.route('/scripts', scriptRoutes);
  });

  it('GET /scripts should list all scripts', async () => {
    const res = await app.request('/scripts');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Test Script');
    expect(mockDb.query.scripts.findMany).toHaveBeenCalled();
  });

  it('POST /scripts should create a script', async () => {
    const res = await app.request('/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Script', color: '#000000' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('New Script');
    expect(data.color).toBe('#000000');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('POST /scripts should return 400 if name is missing', async () => {
    const res = await app.request('/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: '#000000' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /scripts should return 400 if name exceeds 24 characters', async () => {
    const res = await app.request('/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A'.repeat(25) }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('24');
  });

  it('PUT /scripts/:id should update script', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue({
      id: '1',
      name: 'Updated',
      color: '#111',
    });
    const res = await app.request('/scripts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Updated');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('DELETE /scripts/:id should return success', async () => {
    const res = await app.request('/scripts/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('PUT /scripts/reorder should reorder scripts', async () => {
    const res = await app.request('/scripts/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: '1', sortOrder: 0 },
          { id: '2', sortOrder: 1 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('PUT /scripts/reorder should return 400 if items is not an array', async () => {
    const res = await app.request('/scripts/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: 'not-an-array' }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /scripts/:id should return 404 if not found', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue(null);
    const res = await app.request('/scripts/999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });

  it('PUT /scripts/:id should return 400 if name exceeds 24 characters', async () => {
    const res = await app.request('/scripts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A'.repeat(25) }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('24');
  });

  it('DELETE /scripts/:id should clean up R2 objects for track variants', async () => {
    mockDb.query.tracks.findMany.mockResolvedValue([
      {
        id: 'f1',
        variants: [
          { id: 'v1', r2Key: 'audio/f1/1.0.mp3' },
          { id: 'v2', r2Key: 'audio/f1/1.5.mp3' },
        ],
      },
    ]);
    const res = await app.request('/scripts/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
  });

  it('POST /scripts/:scriptId/tracks should return 404 if script not found', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue(null);
    const res = await app.request('/scripts/999/tracks', {
      method: 'POST',
      body: new FormData(),
    });
    expect(res.status).toBe(404);
  });

  it('POST /scripts/:scriptId/tracks should return 400 if no file', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue({ id: '1', name: 'Test' });
    const res = await app.request('/scripts/1/tracks', {
      method: 'POST',
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });

  it('POST /scripts/:scriptId/tracks should return 400 if unsupported audio type', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue({ id: '1', name: 'Test' });
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    const res = await app.request('/scripts/1/tracks', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
  });

  it('POST /scripts/:scriptId/tracks should return 400 if file too large', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue({ id: '1', name: 'Test' });
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(3 * 1024 * 1024)], {
      type: 'audio/mpeg',
    });
    formData.append('file', blob, 'big.mp3');
    const res = await app.request('/scripts/1/tracks', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
  });

  it('POST /scripts/:scriptId/tracks should upload track successfully', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue({ id: '1', name: 'Test' });
    const formData = new FormData();
    const blob = new Blob(['audio-data'], { type: 'audio/mpeg' });
    formData.append('file', blob, 'test.mp3');
    const res = await app.request('/scripts/1/tracks', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.scriptId).toBe('1');
    expect(data.variants).toHaveLength(1);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('POST /scripts should use default color when not provided', async () => {
    const res = await app.request('/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Color Script' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.color).toBe('#8b5cf6');
  });

  it('POST /scripts should use sortOrder 0 when select returns empty result', async () => {
    mockDb.from.mockResolvedValueOnce([]);
    const res = await app.request('/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'First Script', color: '#123456' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.sortOrder).toBe(0);
  });

  it('PUT /scripts/:id should update only color when name not provided', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue({
      id: '1',
      name: 'Test',
      color: '#ff0000',
    });
    const res = await app.request('/scripts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: '#ff0000' }),
    });
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('POST /scripts/:scriptId/tracks should use mp3 ext when filename has no extension', async () => {
    mockDb.query.scripts.findFirst.mockResolvedValue({ id: '1', name: 'Test' });
    const formData = new FormData();
    const blob = new Blob(['audio-data'], { type: 'audio/mpeg' });
    formData.append('file', blob, 'test.');
    const res = await app.request('/scripts/1/tracks', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.variants[0].mimeType).toBe('audio/mpeg');
  });
});
