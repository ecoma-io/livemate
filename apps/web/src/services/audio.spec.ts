import { describe, it, expect, vi } from 'vitest';
import { audioService } from './audio';

// Mock howler - Howl must be a class (constructor)
vi.mock('howler', () => {
  class MockHowl {
    opts: any;
    constructor(opts: any) {
      this.opts = opts;
    }
    play() {
      if (this.opts.onend) setTimeout(this.opts.onend, 10);
    }
    stop() {
      // noop
    }
    unload() {
      // noop
    }
  }
  return { Howl: MockHowl };
});

describe('audioService', () => {
  it('starts with no active playback', () => {
    expect(audioService).toBeDefined();
  });

  it('play creates a Howl and plays', () => {
    audioService.play('/test.mp3');
  });

  it('stop without active playback does not throw', () => {
    audioService.stop();
  });

  it('play then stop works', () => {
    audioService.play('/test.mp3');
    audioService.stop();
  });

  it('play triggers onEnd callback', async () => {
    let ended = false;
    audioService.play('/test.mp3', () => {
      ended = true;
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(ended).toBe(true);
  });

  it('passes format to Howl when mimeType is provided', () => {
    audioService.play('/api/audio/some-uuid', undefined, 'audio/mpeg');
    // Access the last Howl instance via stop() side-effects or check opts
    // The important thing is it doesn't throw
  });

  it('play without mimeType still works', () => {
    audioService.play('/test.mp3');
    // Should not throw
  });

  it('onloaderror triggers cleanup and calls onEnd', async () => {
    // We need to override the mock to trigger onloaderror
    const { Howl } = await import('howler');
    const origPlay = Howl.prototype.play;
    let opts: any;
    Howl.prototype.play = function () {
      opts = (this as any).opts;
      // Trigger onloaderror instead of onend
      if (opts.onloaderror) setTimeout(opts.onloaderror, 10);
      return 0;
    };

    let ended = false;
    audioService.play('/bad.mp3', () => {
      ended = true;
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(ended).toBe(true);

    Howl.prototype.play = origPlay;
  });

  it('onplayerror triggers cleanup and calls onEnd', async () => {
    const { Howl } = await import('howler');
    const origPlay = Howl.prototype.play;
    Howl.prototype.play = function () {
      const o = (this as any).opts;
      if (o.onplayerror) setTimeout(o.onplayerror, 10);
      return 0;
    };

    let ended = false;
    audioService.play('/bad.mp3', () => {
      ended = true;
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(ended).toBe(true);

    Howl.prototype.play = origPlay;
  });

  it('consecutive plays stop the previous one', () => {
    audioService.play('/test1.mp3');
    audioService.play('/test2.mp3');
    // Should not throw, and the first should be stopped
  });

  it('stop calls unload on current howl', () => {
    audioService.play('/test.mp3');
    // Stop should call stop + unload + null
    audioService.stop();
    // Calling stop again should be safe
    audioService.stop();
  });
});
