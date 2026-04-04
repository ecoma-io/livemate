import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlayerStore } from './player';
import { useScriptsStore } from './scripts';
import { audioService } from '../services/audio';

vi.mock('../services/audio', () => ({
  audioService: {
    play: vi.fn((_url: string, onEnd?: () => void) => {
      // simulate immediate onEnd for testing
      if (onEnd) setTimeout(onEnd, 0);
    }),
    stop: vi.fn(),
  },
  getDuration: vi.fn().mockResolvedValue(null),
}));

const mockedAudioService = vi.mocked(audioService);

vi.mock('../services/api', () => ({
  api: {
    audioUrl: (id: string) => `/api/audio/${id}`,
    getScripts: vi.fn().mockResolvedValue([]),
  },
}));

describe('usePlayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default speed 1.0', () => {
    const store = usePlayerStore();
    expect(store.currentSpeed).toBe(1.0);
    expect(store.isPlaying).toBe(false);
    expect(store.activeScriptId).toBeNull();
  });

  it('setSpeed updates speed without stopping playback', () => {
    const store = usePlayerStore();
    store.isPlaying = true;
    store.setSpeed(1.5);
    expect(store.currentSpeed).toBe(1.5);
    expect(store.isPlaying).toBe(true);
  });

  it('play selects a variant from the script', async () => {
    const scriptsStore = useScriptsStore();
    scriptsStore.scripts = [
      {
        id: 'g1',
        name: 'Script 1',
        color: '#22c55e',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'test.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
              {
                id: 'v2',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'def',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const store = usePlayerStore();
    store.play('g1');
    expect(store.isPlaying).toBe(true);
    expect(store.activeScriptId).toBe('g1');
  });

  it('play does nothing for nonexistent script', () => {
    const store = usePlayerStore();
    store.play('nonexistent');
    expect(store.isPlaying).toBe(false);
  });

  it('play does nothing when already playing', () => {
    const store = usePlayerStore();
    store.isPlaying = true;
    store.activeScriptId = 'existing';
    vi.clearAllMocks();
    store.play('g1');
    expect(store.activeScriptId).toBe('existing');
    expect(mockedAudioService.play).not.toHaveBeenCalled();
  });

  it('play does nothing when no variants match current speed', () => {
    const scriptsStore = useScriptsStore();
    scriptsStore.scripts = [
      {
        id: 'g1',
        name: 'Script 1',
        color: '#22c55e',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'test.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.2,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const store = usePlayerStore();
    // Default speed is 1.0 but only 1.2 variant exists
    store.play('g1');
    expect(store.isPlaying).toBe(false);
  });

  it('excludes last played variant', () => {
    const scriptsStore = useScriptsStore();
    scriptsStore.scripts = [
      {
        id: 'g1',
        name: 'Script 1',
        color: '#22c55e',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'test.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
              {
                id: 'v2',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'def',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const store = usePlayerStore();

    // Play multiple times and check last played is excluded
    const playedIds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      store.play('g1');
      // Extract the variant id from the url passed to audioService.play
      const lastCall =
        mockedAudioService.play.mock.calls[
          mockedAudioService.play.mock.calls.length - 1
        ];
      const url = lastCall[0] as string;
      const variantId = url.split('/').pop() as string;
      playedIds.add(variantId);
      store.stop(); // simulate audio ending before next play
    }
    // Both variants should have been played
    expect(playedIds.size).toBe(2);
  });

  it('stop resets playback state', () => {
    const store = usePlayerStore();
    store.isPlaying = true;
    store.activeScriptId = 'g1';
    store.stop();
    expect(store.isPlaying).toBe(false);
    expect(store.activeScriptId).toBeNull();
  });

  it('plays script with single file having only 1.0x variant', () => {
    const scriptsStore = useScriptsStore();
    scriptsStore.scripts = [
      {
        id: 'g1',
        name: 'Single File Script',
        color: '#22c55e',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'original.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const store = usePlayerStore();
    // Default speed is 1.0
    expect(store.currentSpeed).toBe(1.0);

    store.play('g1');

    // Must start playing
    expect(store.isPlaying).toBe(true);
    expect(store.activeScriptId).toBe('g1');

    // Verify the correct audio URL was called
    expect(mockedAudioService.play).toHaveBeenCalledWith(
      '/api/audio/v1',
      expect.any(Function),
      'audio/mpeg',
    );
  });

  it('does not play script with single file having only 1.0x variant at 1.2x speed', () => {
    const scriptsStore = useScriptsStore();
    scriptsStore.scripts = [
      {
        id: 'g1',
        name: 'Single File Script',
        color: '#22c55e',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'original.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const store = usePlayerStore();
    store.setSpeed(1.2);
    mockedAudioService.play.mockClear();
    store.play('g1');

    // Must NOT start playing — no 1.2x variant
    expect(store.isPlaying).toBe(false);
    expect(mockedAudioService.play).not.toHaveBeenCalled();
  });

  it('replays single variant when it was last played (pool fallback)', () => {
    const scriptsStore = useScriptsStore();
    scriptsStore.scripts = [
      {
        id: 'g1',
        name: 'Solo Variant',
        color: '#22c55e',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 'g1',
            name: 'solo.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const store = usePlayerStore();

    // Play twice — the single variant should replay even though it was last played
    store.play('g1');
    expect(store.isPlaying).toBe(true);

    store.stop(); // simulate audio ending naturally
    mockedAudioService.play.mockClear();
    store.play('g1');
    expect(store.isPlaying).toBe(true);
    expect(mockedAudioService.play).toHaveBeenCalledWith(
      '/api/audio/v1',
      expect.any(Function),
      'audio/mpeg',
    );
  });
});
