import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useMediaSession } from './useMediaSession';

// Polyfill MediaMetadata for jsdom
if (typeof globalThis.MediaMetadata === 'undefined') {
  (globalThis as any).MediaMetadata = class MediaMetadata {
    title: string;
    artist: string;
    album: string;
    artwork: any[];
    constructor(opts: any = {}) {
      this.title = opts.title || '';
      this.artist = opts.artist || '';
      this.album = opts.album || '';
      this.artwork = opts.artwork || [];
    }
  };
}

describe('useMediaSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets up media session handlers on mount when supported', async () => {
    const mockSetActionHandler = vi.fn();
    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        metadata: null,
        setActionHandler: mockSetActionHandler,
      },
      configurable: true,
      writable: true,
    });

    const onToggle = vi.fn();

    mount(
      defineComponent({
        setup() {
          useMediaSession(onToggle);
          return {};
        },
        render: () => null,
      }),
    );

    await nextTick();

    expect(navigator.mediaSession.metadata).toBeTruthy();
    expect(mockSetActionHandler).toHaveBeenCalledWith('play', onToggle);
    expect(mockSetActionHandler).toHaveBeenCalledWith('pause', onToggle);
  });

  it('does nothing when mediaSession not supported', async () => {
    // Remove mediaSession from navigator
    const nav = navigator as any;
    const original = nav.mediaSession;
    delete nav.mediaSession;

    const onToggle = vi.fn();

    // Should not throw
    mount(
      defineComponent({
        setup() {
          useMediaSession(onToggle);
          return {};
        },
        render: () => null,
      }),
    );

    await nextTick();

    // Restore
    if (original) {
      Object.defineProperty(navigator, 'mediaSession', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});
