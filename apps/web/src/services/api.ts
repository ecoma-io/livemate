import { API_BASE_URL } from '../config/apiConfig';

async function fetchApi<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((error as { error: string }).error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

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
}

export interface ManifestData {
  version: string;
  scripts: { id: string; name: string; color: string; sortOrder: number }[];
  variants: {
    id: string;
    trackId: string;
    scriptId: string;
    speed: number;
    url: string;
    hash: string;
    size: number;
    mimeType: string;
  }[];
}

export const api = {
  getScripts: () => fetchApi<ScriptData[]>('/scripts'),

  createScript: (data: { name: string; color: string }) =>
    fetchApi<ScriptData>('/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateScript: (id: string, data: { name?: string; color?: string }) =>
    fetchApi<ScriptData>(`/scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteScript: (id: string) =>
    fetchApi<void>(`/scripts/${id}`, { method: 'DELETE' }),

  reorderScripts: (items: { id: string; sortOrder: number }[]) =>
    fetchApi<{ success: boolean }>('/scripts/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),

  uploadTrack: (scriptId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<TrackData>(`/scripts/${scriptId}/tracks`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteTrack: (trackId: string) =>
    fetchApi<void>(`/tracks/${trackId}`, { method: 'DELETE' }),

  updateTrack: (trackId: string, data: { name: string }) =>
    fetchApi<TrackData>(`/tracks/${trackId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  uploadVariant: (trackId: string, speed: number, blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, `variant_${speed}.mp3`);
    formData.append('speed', speed.toString());
    return fetchApi<VariantData>(`/tracks/${trackId}/variants`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteVariant: (variantId: string) =>
    fetchApi<void>(`/variants/${variantId}`, { method: 'DELETE' }),

  getManifest: () => fetchApi<ManifestData>('/manifest'),

  audioUrl: (variantId: string) => `${API_BASE_URL}/audio/${variantId}`,
};
