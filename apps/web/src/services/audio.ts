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
