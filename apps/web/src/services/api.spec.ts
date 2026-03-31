import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiConfig before importing api
vi.mock('../config/apiConfig', () => ({
  API_BASE_URL: 'http://test-api',
}));

import { api } from './api';

describe('api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(data: unknown, status = 200) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'OK',
      json: () => Promise.resolve(data),
    } as Response);
  }

  function mockFetchError(errorBody: { error: string }, status = 400) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status,
      statusText: 'Bad Request',
      json: () => Promise.resolve(errorBody),
    } as Response);
  }

  describe('getScripts', () => {
    it('fetches scripts', async () => {
      const scripts = [
        {
          id: 's1',
          name: 'Test',
          color: '#ff0000',
          sortOrder: 0,
          tracks: [],
        },
      ];
      const spy = mockFetch(scripts);

      const result = await api.getScripts();

      expect(spy).toHaveBeenCalledWith('http://test-api/scripts', undefined);
      expect(result).toEqual(scripts);
    });
  });

  describe('createScript', () => {
    it('sends POST with name and color', async () => {
      const script = {
        id: 's1',
        name: 'New',
        color: '#00ff00',
        sortOrder: 0,
        tracks: [],
      };
      const spy = mockFetch(script);

      const result = await api.createScript({ name: 'New', color: '#00ff00' });

      expect(spy).toHaveBeenCalledWith('http://test-api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New', color: '#00ff00' }),
      });
      expect(result).toEqual(script);
    });
  });

  describe('updateScript', () => {
    it('sends PUT with partial data', async () => {
      const updated = {
        id: 's1',
        name: 'Updated',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      };
      const spy = mockFetch(updated);

      const result = await api.updateScript('s1', { name: 'Updated' });

      expect(spy).toHaveBeenCalledWith('http://test-api/scripts/s1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteScript', () => {
    it('sends DELETE and returns undefined for 204', async () => {
      const spy = mockFetch(undefined, 204);

      const result = await api.deleteScript('s1');

      expect(spy).toHaveBeenCalledWith('http://test-api/scripts/s1', {
        method: 'DELETE',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('reorderScripts', () => {
    it('sends PUT with items array', async () => {
      const items = [
        { id: 's1', sortOrder: 1 },
        { id: 's2', sortOrder: 0 },
      ];
      const spy = mockFetch({ success: true });

      await api.reorderScripts(items);

      expect(spy).toHaveBeenCalledWith('http://test-api/scripts/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    });
  });

  describe('uploadTrack', () => {
    it('sends POST with FormData', async () => {
      const fileData = {
        id: 'f1',
        scriptId: 's1',
        name: 'test.mp3',
        variants: [],
      };
      const spy = mockFetch(fileData);
      const file = new File(['audio-data'], 'test.mp3', { type: 'audio/mpeg' });

      const result = await api.uploadTrack('s1', file);

      expect(spy).toHaveBeenCalledWith(
        'http://test-api/scripts/s1/tracks',
        expect.objectContaining({
          method: 'POST',
        }),
      );
      const callBody = spy.mock.calls[0][1]?.body as FormData;
      expect(callBody.get('file')).toBeInstanceOf(File);
      expect(result).toEqual(fileData);
    });
  });

  describe('deleteTrack', () => {
    it('sends DELETE', async () => {
      const spy = mockFetch(undefined, 204);

      await api.deleteTrack('f1');

      expect(spy).toHaveBeenCalledWith('http://test-api/tracks/f1', {
        method: 'DELETE',
      });
    });
  });

  describe('uploadVariant', () => {
    it('sends POST with blob and speed', async () => {
      const variant = {
        id: 'v1',
        trackId: 'f1',
        speed: 1.2,
        contentHash: 'abc',
        fileSize: 500,
        mimeType: 'audio/mpeg',
      };
      const spy = mockFetch(variant);
      const blob = new Blob(['data'], { type: 'audio/mpeg' });

      const result = await api.uploadVariant('f1', 1.2, blob);

      expect(spy).toHaveBeenCalledWith(
        'http://test-api/tracks/f1/variants',
        expect.objectContaining({
          method: 'POST',
        }),
      );
      const callBody = spy.mock.calls[0][1]?.body as FormData;
      expect(callBody.get('speed')).toBe('1.2');
      expect(result).toEqual(variant);
    });
  });

  describe('deleteVariant', () => {
    it('sends DELETE', async () => {
      const spy = mockFetch(undefined, 204);

      await api.deleteVariant('v1');

      expect(spy).toHaveBeenCalledWith('http://test-api/variants/v1', {
        method: 'DELETE',
      });
    });
  });

  describe('getManifest', () => {
    it('fetches manifest', async () => {
      const manifest = { version: '1', scripts: [], variants: [] };
      const spy = mockFetch(manifest);

      const result = await api.getManifest();

      expect(spy).toHaveBeenCalledWith('http://test-api/manifest', undefined);
      expect(result).toEqual(manifest);
    });
  });

  describe('audioUrl', () => {
    it('returns correct audio URL', () => {
      expect(api.audioUrl('v1')).toBe('http://test-api/audio/v1');
    });
  });

  describe('error handling', () => {
    it('throws error from response body', async () => {
      mockFetchError({ error: 'Not found' }, 404);

      await expect(api.getScripts()).rejects.toThrow('Not found');
    });

    it('throws statusText when response body has no error field', async () => {
      mockFetchError({ error: '' }, 500);

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      } as Response);

      await expect(api.getScripts()).rejects.toThrow('Internal Server Error');
    });

    it('throws statusText when JSON parsing fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('invalid json')),
      } as Response);

      await expect(api.getScripts()).rejects.toThrow('Internal Server Error');
    });
  });
});
