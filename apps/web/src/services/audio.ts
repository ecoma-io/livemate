import { Howl } from 'howler';

// Map MIME types to Howler.js format identifiers
const MIME_TO_FORMAT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'mp4',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

class AudioService {
  private currentHowl: Howl | null = null;
  private currentVolume = 1.0;

  play(url: string, onEnd?: () => void, mimeType?: string) {
    this.stop();

    const format = mimeType ? MIME_TO_FORMAT[mimeType] : undefined;

    this.currentHowl = new Howl({
      src: [url],
      ...(format ? { format: [format] } : {}),
      html5: false, // Web Audio API mode for zero-latency on cached files
      volume: this.currentVolume,
      onend: () => {
        this.cleanup();
        onEnd?.();
      },
      onloaderror: () => {
        this.cleanup();
        onEnd?.();
      },
      onplayerror: () => {
        this.cleanup();
        onEnd?.();
      },
    });
    this.currentHowl.play();
  }

  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.currentHowl?.volume(this.currentVolume);
  }

  stop() {
    if (this.currentHowl) {
      this.currentHowl.stop();
      this.cleanup();
    }
  }

  private cleanup() {
    if (this.currentHowl) {
      this.currentHowl.unload();
      this.currentHowl = null;
    }
  }
}

export const audioService = new AudioService();

/**
 * Extract the duration (in seconds) from a Blob/File using the browser's
 * HTMLAudioElement. Resolves with null if the duration cannot be determined.
 */
export function getDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio();

      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* no-op */
        }
      };

      audio.addEventListener(
        'loadedmetadata',
        () => {
          const d =
            isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : null;
          cleanup();
          resolve(d);
        },
        { once: true },
      );

      audio.addEventListener(
        'error',
        () => {
          cleanup();
          resolve(null);
        },
        { once: true },
      );

      audio.src = url;
    } catch {
      resolve(null);
    }
  });
}
