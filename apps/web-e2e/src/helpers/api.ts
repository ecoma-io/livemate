/**
 * API helpers for E2E test setup/teardown.
 * Calls the API directly to create/clean test data without UI interaction.
 */

import { API_BASE } from '../config/urls';

export interface ScriptData {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  tracks: TrackData[];
}

export interface TrackData {
  id: string;
  scriptId: string;
  name: string;
  variants: VariantData[];
}

export interface VariantData {
  id: string;
  trackId: string;
  speed: number;
  contentHash: string;
  fileSize: number;
  mimeType: string;
  duration?: number | null;
}

async function fetchApi<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `API ${options?.method || 'GET'} ${path} failed (${res.status}): ${text}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Create a script via API */
export async function createScript(
  name: string,
  color = '#22c55e',
): Promise<ScriptData> {
  return fetchApi<ScriptData>('/scripts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
}

/** Delete a script via API */
export async function deleteScript(id: string): Promise<void> {
  await fetchApi<void>(`/scripts/${id}`, { method: 'DELETE' });
}

/** Get all scripts via API */
export async function getScripts(): Promise<ScriptData[]> {
  return fetchApi<ScriptData[]>('/scripts');
}

/** Upload an audio file to a script via API */
export async function uploadTrack(
  scriptId: string,
  fileName: string,
  audioBuffer: Buffer,
  mimeType = 'audio/mpeg',
  duration?: number | null,
): Promise<TrackData> {
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, fileName);
  if (duration != null) formData.append('duration', duration.toString());
  return fetchApi<TrackData>(`/scripts/${scriptId}/tracks`, {
    method: 'POST',
    body: formData,
  });
}

/** Upload a speed variant for a file via API */
export async function uploadVariant(
  fileId: string,
  speed: number,
  audioBuffer: Buffer,
  duration?: number | null,
): Promise<VariantData> {
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' });
  const formData = new FormData();
  formData.append('file', blob, `variant_${speed}.mp3`);
  formData.append('speed', speed.toString());
  if (duration != null) formData.append('duration', duration.toString());
  return fetchApi<VariantData>(`/tracks/${fileId}/variants`, {
    method: 'POST',
    body: formData,
  });
}

/** Delete a file via API */
export async function deleteTrack(fileId: string): Promise<void> {
  await fetchApi<void>(`/tracks/${fileId}`, { method: 'DELETE' });
}

/**
 * Tracks scripts created during a test so only those are cleaned up.
 * This avoids deleting developer data in a shared database.
 */
export class TestScriptTracker {
  private scriptIds: string[] = [];

  /** Create a script and track its ID for cleanup */
  async createScript(name: string, color = '#22c55e'): Promise<ScriptData> {
    const script = await createScript(name, color);
    this.scriptIds.push(script.id);
    return script;
  }

  /** Track an existing script ID (e.g. created via UI) for cleanup */
  trackScript(id: string): void {
    if (!this.scriptIds.includes(id)) {
      this.scriptIds.push(id);
    }
  }

  /** Find a script by name and track it for cleanup */
  async trackScriptByName(name: string): Promise<void> {
    const scripts = await getScripts();
    const script = scripts.find((g) => g.name === name);
    if (script && !this.scriptIds.includes(script.id)) {
      this.scriptIds.push(script.id);
    }
  }

  /** Delete only the tracked scripts */
  async cleanup(): Promise<void> {
    for (const id of this.scriptIds) {
      try {
        await deleteScript(id);
      } catch {
        // Script may already be deleted by the test itself
      }
    }
    this.scriptIds = [];
  }
}

/** Generate a minimal valid MP3 buffer for testing (silence, ~1KB) */
export function generateTestMp3(sizeKB = 1): Buffer {
  // Minimal MP3 frame: MPEG1 Layer3 128kbps 44100Hz stereo
  // Frame header: FF FB 90 00
  const frameHeader = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
  const frameSize = 417; // bytes for 128kbps 44100Hz
  const frameData = Buffer.alloc(frameSize - 4); // rest of frame is zeros (silence)
  const frame = Buffer.concat([frameHeader, frameData]);

  const targetSize = sizeKB * 1024;
  const framesNeeded = Math.ceil(targetSize / frameSize);
  const frames: Buffer[] = [];
  for (let i = 0; i < framesNeeded; i++) {
    frames.push(frame);
  }
  return Buffer.concat(frames).subarray(0, targetSize);
}
