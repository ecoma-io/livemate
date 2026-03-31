import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type ProgressCallback = (progress: number) => void;

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private _loaded = false;
  private _loading = false;

  async load() {
    if (this._loaded || this._loading) return;
    this._loading = true;

    try {
      this.ffmpeg = new FFmpeg();
      const multiThread = typeof SharedArrayBuffer !== 'undefined';
      const pkg = multiThread
        ? '@ffmpeg/core-mt@0.12.6'
        : '@ffmpeg/core@0.12.6';

      // In dev, proxy through Vite to avoid COEP blocking cross-origin fetches
      const baseURL = import.meta.env.DEV
        ? `/ffmpeg/${pkg}/dist/esm`
        : `https://unpkg.com/${pkg}/dist/esm`;

      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript',
      );
      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm',
      );

      if (multiThread) {
        const workerURL = await toBlobURL(
          `${baseURL}/ffmpeg-core.worker.js`,
          'text/javascript',
        );
        await this.ffmpeg.load({ coreURL, wasmURL, workerURL });
      } else {
        await this.ffmpeg.load({ coreURL, wasmURL });
      }

      this._loaded = true;
    } finally {
      this._loading = false;
    }
  }

  async changeSpeed(
    inputFile: File | Blob,
    speed: number,
    onProgress?: ProgressCallback,
  ): Promise<Blob> {
    if (!this.ffmpeg || !this._loaded) {
      throw new Error('FFmpeg not loaded. Call load() first.');
    }

    // Determine extension from mime type for proper format detection
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/wave': 'wav',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
    };
    const ext = mimeToExt[inputFile.type] || 'mp3';
    const inputName = `input.${ext}`;
    const outputName = 'output.mp3';

    const progressHandler = onProgress
      ? ({ progress }: { progress: number }) => {
          onProgress(Math.min(Math.round(progress * 100), 100));
        }
      : null;

    if (progressHandler) {
      this.ffmpeg.on('progress', progressHandler);
    }

    try {
      await this.ffmpeg.writeFile(inputName, await fetchFile(inputFile));
      await this.ffmpeg.exec([
        '-i',
        inputName,
        '-filter:a',
        `atempo=${speed}`,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-q:a',
        '2',
        outputName,
      ]);

      const data = await this.ffmpeg.readFile(outputName);

      // Cleanup ffmpeg filesystem
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      const bytes =
        data instanceof Uint8Array
          ? data
          : new TextEncoder().encode(data as string);
      return new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' });
    } finally {
      if (progressHandler) {
        this.ffmpeg.off('progress', progressHandler);
      }
    }
  }

  get isLoaded() {
    return this._loaded;
  }

  get isLoading() {
    return this._loading;
  }
}

export const ffmpegService = new FFmpegService();
