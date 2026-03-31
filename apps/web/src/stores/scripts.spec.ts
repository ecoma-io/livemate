import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useScriptsStore } from './scripts';

// Mock the API module
vi.mock('../services/api', () => ({
  api: {
    getScripts: vi.fn(),
    createScript: vi.fn(),
    updateScript: vi.fn(),
    deleteScript: vi.fn(),
    reorderScripts: vi.fn(),
    uploadTrack: vi.fn(),
    deleteTrack: vi.fn(),
    uploadVariant: vi.fn(),
    deleteVariant: vi.fn(),
  },
}));

describe('useScriptsStore', () => {
  let apiMock: typeof import('../services/api').api;

  beforeEach(async () => {
    setActivePinia(createPinia());
    apiMock = (await import('../services/api')).api as any;
    vi.clearAllMocks();
  });

  it('fetchScripts loads scripts', async () => {
    const mockScripts = [
      { id: 'g1', name: 'Test', color: '#ff0000', sortOrder: 0, tracks: [] },
    ];
    vi.mocked(apiMock.getScripts).mockResolvedValue(mockScripts);

    const store = useScriptsStore();
    await store.fetchScripts();

    expect(store.scripts).toEqual(mockScripts);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetchScripts handles errors', async () => {
    vi.mocked(apiMock.getScripts).mockRejectedValue(new Error('Network error'));

    const store = useScriptsStore();
    await store.fetchScripts();

    expect(store.scripts).toEqual([]);
    expect(store.error).toBe('Network error');
  });

  it('createScript adds to scripts', async () => {
    const newScript = {
      id: 'g1',
      name: 'New Script',
      color: '#ff0000',
      sortOrder: 0,
      tracks: [],
    };
    vi.mocked(apiMock.createScript).mockResolvedValue(newScript);

    const store = useScriptsStore();
    await store.createScript('New Script', '#ff0000');

    expect(store.scripts).toHaveLength(1);
    expect(store.scripts[0].name).toBe('New Script');
  });

  it('deleteScript removes from scripts', async () => {
    vi.mocked(apiMock.deleteScript).mockResolvedValue(undefined);

    const store = useScriptsStore();
    store.scripts = [
      { id: 'g1', name: 'Test', color: '#ff0000', sortOrder: 0, tracks: [] },
    ];

    await store.deleteScript('g1');
    expect(store.scripts).toHaveLength(0);
  });

  it('updateScript updates script in list', async () => {
    const updated = {
      id: 'g1',
      name: 'Updated',
      color: '#00ff00',
      sortOrder: 0,
      tracks: [],
    };
    vi.mocked(apiMock.updateScript).mockResolvedValue(updated);

    const store = useScriptsStore();
    store.scripts = [
      { id: 'g1', name: 'Old', color: '#ff0000', sortOrder: 0, tracks: [] },
    ];

    await store.updateScript('g1', { name: 'Updated', color: '#00ff00' });
    expect(store.scripts[0].name).toBe('Updated');
  });

  it('uploadTrack adds track to script', async () => {
    const mockTrack = {
      id: 'f1',
      scriptId: 'g1',
      name: 'test.mp3',
      variants: [],
    };
    vi.mocked(apiMock.uploadTrack).mockResolvedValue(mockTrack);

    const store = useScriptsStore();
    store.scripts = [
      { id: 'g1', name: 'Test', color: '#ff0000', sortOrder: 0, tracks: [] },
    ];

    await store.uploadTrack('g1', new File(['data'], 'test.mp3'));
    expect(store.scripts[0].tracks).toHaveLength(1);
  });

  it('deleteTrack removes track from all scripts', async () => {
    vi.mocked(apiMock.deleteTrack).mockResolvedValue(undefined);

    const store = useScriptsStore();
    store.scripts = [
      {
        id: 'g1',
        name: 'Test',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [
          { id: 'f1', scriptId: 'g1', name: 'test.mp3', variants: [] },
        ],
      },
    ];

    await store.deleteTrack('f1');
    expect(store.scripts[0].tracks).toHaveLength(0);
  });

  it('uploadVariant adds variant to track', async () => {
    const mockVariant = {
      id: 'var1',
      trackId: 'f1',
      speed: 1.2,
      contentHash: 'abc',
      fileSize: 500,
      mimeType: 'audio/mpeg',
    };
    vi.mocked(apiMock.uploadVariant).mockResolvedValue(mockVariant);

    const store = useScriptsStore();
    store.scripts = [
      {
        id: 'g1',
        name: 'Test',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [
          { id: 'f1', scriptId: 'g1', name: 'test.mp3', variants: [] },
        ],
      },
    ];

    await store.uploadVariant('f1', 1.2, new Blob(['data']));
    expect(store.scripts[0].tracks[0].variants).toHaveLength(1);
    expect(store.scripts[0].tracks[0].variants[0].speed).toBe(1.2);
  });

  it('reorderScripts updates sortOrder', async () => {
    vi.mocked(apiMock.reorderScripts).mockResolvedValue({ success: true });

    const store = useScriptsStore();
    store.scripts = [
      { id: 'g1', name: 'A', color: '#ff0000', sortOrder: 0, tracks: [] },
      { id: 'g2', name: 'B', color: '#00ff00', sortOrder: 1, tracks: [] },
    ];

    await store.reorderScripts([
      { id: 'g2', sortOrder: 0 },
      { id: 'g1', sortOrder: 1 },
    ]);

    expect(store.scripts[0].id).toBe('g2');
    expect(store.scripts[1].id).toBe('g1');
  });

  it('deleteVariant removes variant from all tracks', async () => {
    vi.mocked(apiMock.deleteVariant).mockResolvedValue(undefined);

    const store = useScriptsStore();
    store.scripts = [
      {
        id: 'g1',
        name: 'Test',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'test.mp3',
            variants: [
              { id: 'var1', trackId: 'f1', speed: 1.0, contentHash: 'abc', fileSize: 500, mimeType: 'audio/mpeg' },
              { id: 'var2', trackId: 'f1', speed: 1.2, contentHash: 'def', fileSize: 600, mimeType: 'audio/mpeg' },
            ],
          },
        ],
      },
    ];

    await store.deleteVariant('var2');
    expect(store.scripts[0].tracks[0].variants).toHaveLength(1);
    expect(store.scripts[0].tracks[0].variants[0].id).toBe('var1');
  });

  it('uploadVariant replaces existing variant with same speed', async () => {
    const newVariant = {
      id: 'var3',
      trackId: 'f1',
      speed: 1.2,
      contentHash: 'new',
      fileSize: 700,
      mimeType: 'audio/mpeg',
    };
    vi.mocked(apiMock.uploadVariant).mockResolvedValue(newVariant);

    const store = useScriptsStore();
    store.scripts = [
      {
        id: 'g1',
        name: 'Test',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'test.mp3',
            variants: [
              { id: 'var1', trackId: 'f1', speed: 1.0, contentHash: 'abc', fileSize: 500, mimeType: 'audio/mpeg' },
              { id: 'var2', trackId: 'f1', speed: 1.2, contentHash: 'old', fileSize: 600, mimeType: 'audio/mpeg' },
            ],
          },
        ],
      },
    ];

    await store.uploadVariant('f1', 1.2, new Blob(['data']));

    const variants = store.scripts[0].tracks[0].variants;
    expect(variants).toHaveLength(2);
    // The old 1.2 variant should be replaced
    expect(variants.find((v) => v.id === 'var2')).toBeUndefined();
    expect(variants.find((v) => v.id === 'var3')).toBeDefined();
  });
});
