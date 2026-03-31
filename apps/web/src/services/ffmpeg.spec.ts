import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @ffmpeg/ffmpeg and @ffmpeg/util before importing
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockLoad = vi.fn();
const mockWriteFile = vi.fn();
const mockExec = vi.fn();
const mockReadFile = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock('@ffmpeg/ffmpeg', () => {
  return {
    FFmpeg: class MockFFmpeg {
      load = mockLoad;
      on = mockOn;
      off = mockOff;
      writeFile = mockWriteFile;
      exec = mockExec;
      readFile = mockReadFile;
      deleteFile = mockDeleteFile;
    },
  };
});

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  toBlobURL: vi.fn().mockImplementation((url: string) => Promise.resolve(`blob:${url}`)),
}));

// Need to reset module state between tests (singleton)
let ffmpegService: typeof import('./ffmpeg').ffmpegService;

describe('FFmpegService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to get a fresh singleton
    vi.resetModules();

    // Re-mock after resetModules using class syntax
    vi.doMock('@ffmpeg/ffmpeg', () => ({
      FFmpeg: class MockFFmpeg {
        load = mockLoad;
        on = mockOn;
        off = mockOff;
        writeFile = mockWriteFile;
        exec = mockExec;
        readFile = mockReadFile;
        deleteFile = mockDeleteFile;
      },
    }));

    vi.doMock('@ffmpeg/util', () => ({
      fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      toBlobURL: vi.fn().mockImplementation((url: string) => Promise.resolve(`blob:${url}`)),
    }));

    const mod = await import('./ffmpeg');
    ffmpegService = mod.ffmpegService;
  });

  describe('load', () => {
    it('loads FFmpeg successfully', async () => {
      expect(ffmpegService.isLoaded).toBe(false);
      expect(ffmpegService.isLoading).toBe(false);

      await ffmpegService.load();

      expect(ffmpegService.isLoaded).toBe(true);
      expect(ffmpegService.isLoading).toBe(false);
      expect(mockLoad).toHaveBeenCalled();
    });

    it('does not load again if already loaded', async () => {
      await ffmpegService.load();
      mockLoad.mockClear();

      await ffmpegService.load();

      expect(mockLoad).not.toHaveBeenCalled();
    });

    it('does not load again if currently loading', async () => {
      // Start first load but don't await
      mockLoad.mockImplementation(() => new Promise((r) => setTimeout(r, 50)));
      const p1 = ffmpegService.load();
      const p2 = ffmpegService.load();
      await p1;
      await p2;

      expect(mockLoad).toHaveBeenCalledTimes(1);
    });

    it('resets loading flag even if load fails', async () => {
      mockLoad.mockRejectedValueOnce(new Error('load failed'));

      await expect(ffmpegService.load()).rejects.toThrow('load failed');

      expect(ffmpegService.isLoading).toBe(false);
      expect(ffmpegService.isLoaded).toBe(false);
    });
  });

  describe('changeSpeed', () => {
    beforeEach(async () => {
      await ffmpegService.load();
      mockReadFile.mockResolvedValue(new Uint8Array([4, 5, 6]));
    });

    it('throws if FFmpeg is not loaded', async () => {
      vi.resetModules();
      vi.doMock('@ffmpeg/ffmpeg', () => ({
        FFmpeg: class MockFFmpeg {
          load = mockLoad; on = mockOn; off = mockOff;
          writeFile = mockWriteFile; exec = mockExec;
          readFile = mockReadFile; deleteFile = mockDeleteFile;
        },
      }));
      vi.doMock('@ffmpeg/util', () => ({
        fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        toBlobURL: vi.fn().mockImplementation((url: string) => Promise.resolve(`blob:${url}`)),
      }));
      const mod = await import('./ffmpeg');
      const freshService = mod.ffmpegService;

      await expect(
        freshService.changeSpeed(new Blob(['data']), 1.2),
      ).rejects.toThrow('FFmpeg not loaded');
    });

    it('processes audio and returns blob', async () => {
      const inputBlob = new Blob(['audio'], { type: 'audio/mpeg' });

      const result = await ffmpegService.changeSpeed(inputBlob, 1.5);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/mpeg');
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalledWith([
        '-i', 'input.mp3', '-filter:a', 'atempo=1.5',
        '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'output.mp3',
      ]);
      expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    });

    it('uses correct extension for different mime types', async () => {
      const wavBlob = new Blob(['audio'], { type: 'audio/wav' });
      await ffmpegService.changeSpeed(wavBlob, 1.2);
      expect(mockExec).toHaveBeenCalledWith(expect.arrayContaining(['-i', 'input.wav']));
    });

    it('defaults to mp3 for unknown mime type', async () => {
      const unknownBlob = new Blob(['audio'], { type: 'audio/unknown' });
      await ffmpegService.changeSpeed(unknownBlob, 1.2);
      expect(mockExec).toHaveBeenCalledWith(expect.arrayContaining(['-i', 'input.mp3']));
    });

    it('calls onProgress callback', async () => {
      let capturedHandler: ((e: { progress: number }) => void) | null = null;
      mockOn.mockImplementation((_event: string, handler: (e: { progress: number }) => void) => {
        capturedHandler = handler;
      });

      const onProgress = vi.fn();
      const promise = ffmpegService.changeSpeed(
        new Blob(['audio'], { type: 'audio/mpeg' }),
        1.3,
        onProgress,
      );

      // Simulate progress callback
      if (capturedHandler) {
        (capturedHandler as (e: { progress: number }) => void)({ progress: 0.5 });
      }

      await promise;

      expect(mockOn).toHaveBeenCalledWith('progress', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('progress', expect.any(Function));
      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('caps progress at 100', async () => {
      let capturedHandler: ((e: { progress: number }) => void) | null = null;
      mockOn.mockImplementation((_event: string, handler: (e: { progress: number }) => void) => {
        capturedHandler = handler;
      });

      const onProgress = vi.fn();
      const promise = ffmpegService.changeSpeed(
        new Blob(['audio'], { type: 'audio/mpeg' }),
        1.3,
        onProgress,
      );

      if (capturedHandler) {
        (capturedHandler as (e: { progress: number }) => void)({ progress: 1.5 });
      }

      await promise;
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('does not register progress handler when no callback', async () => {
      await ffmpegService.changeSpeed(
        new Blob(['audio'], { type: 'audio/mpeg' }),
        1.2,
      );

      expect(mockOn).not.toHaveBeenCalled();
      expect(mockOff).not.toHaveBeenCalled();
    });

    it('cleans up progress handler even on error', async () => {
      mockExec.mockRejectedValueOnce(new Error('exec failed'));
      const onProgress = vi.fn();

      await expect(
        ffmpegService.changeSpeed(
          new Blob(['audio'], { type: 'audio/mpeg' }),
          1.2,
          onProgress,
        ),
      ).rejects.toThrow('exec failed');

      expect(mockOff).toHaveBeenCalled();
    });

    it('handles readFile returning string data', async () => {
      mockReadFile.mockResolvedValue('string-data');

      const result = await ffmpegService.changeSpeed(
        new Blob(['audio'], { type: 'audio/mpeg' }),
        1.2,
      );

      expect(result).toBeInstanceOf(Blob);
    });

    it('maps m4a mime type correctly', async () => {
      const m4aBlob = new Blob(['audio'], { type: 'audio/x-m4a' });
      await ffmpegService.changeSpeed(m4aBlob, 1.2);
      expect(mockExec).toHaveBeenCalledWith(expect.arrayContaining(['-i', 'input.m4a']));
    });

    it('maps ogg mime type correctly', async () => {
      const oggBlob = new Blob(['audio'], { type: 'audio/ogg' });
      await ffmpegService.changeSpeed(oggBlob, 1.2);
      expect(mockExec).toHaveBeenCalledWith(expect.arrayContaining(['-i', 'input.ogg']));
    });

    it('maps webm mime type correctly', async () => {
      const webmBlob = new Blob(['audio'], { type: 'audio/webm' });
      await ffmpegService.changeSpeed(webmBlob, 1.2);
      expect(mockExec).toHaveBeenCalledWith(expect.arrayContaining(['-i', 'input.webm']));
    });
  });
});
