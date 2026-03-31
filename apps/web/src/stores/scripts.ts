import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  api,
  type ScriptData,
  type TrackData,
  type VariantData,
} from '../services/api';

export type { ScriptData, TrackData, VariantData };

export const useScriptsStore = defineStore('scripts', () => {
  const scripts = ref<ScriptData[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchScripts() {
    loading.value = true;
    error.value = null;
    try {
      scripts.value = await api.getScripts();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function createScript(name: string, color: string) {
    const script = await api.createScript({ name, color });
    scripts.value.push(script);
    return script;
  }

  async function updateScript(
    id: string,
    data: { name?: string; color?: string },
  ) {
    const updated = await api.updateScript(id, data);
    const index = scripts.value.findIndex((g) => g.id === id);
    if (index >= 0) scripts.value[index] = updated;
    return updated;
  }

  async function deleteScript(id: string) {
    await api.deleteScript(id);
    scripts.value = scripts.value.filter((g) => g.id !== id);
  }

  async function reorderScripts(
    items: { id: string; sortOrder: number }[],
  ) {
    await api.reorderScripts(items);
    for (const item of items) {
      const script = scripts.value.find((g) => g.id === item.id);
      if (script) script.sortOrder = item.sortOrder;
    }
    scripts.value.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async function uploadTrack(scriptId: string, file: File) {
    const result = await api.uploadTrack(scriptId, file);
    const script = scripts.value.find((g) => g.id === scriptId);
    if (script) script.tracks.push(result);
    return result;
  }

  async function deleteTrack(trackId: string) {
    await api.deleteTrack(trackId);
    for (const script of scripts.value) {
      script.tracks = script.tracks.filter((f) => f.id !== trackId);
    }
  }

  async function updateTrack(trackId: string, data: { name: string }) {
    const updated = await api.updateTrack(trackId, data);
    for (const script of scripts.value) {
      const idx = script.tracks.findIndex((f) => f.id === trackId);
      if (idx >= 0) {
        script.tracks[idx] = { ...script.tracks[idx], name: updated.name };
        break;
      }
    }
    return updated;
  }

  async function uploadVariant(
    trackId: string,
    speed: number,
    blob: Blob,
  ) {
    const variant = await api.uploadVariant(trackId, speed, blob);
    for (const script of scripts.value) {
      const track = script.tracks.find((f) => f.id === trackId);
      if (track) {
        track.variants = track.variants.filter(
          (v) => v.speed !== speed,
        );
        track.variants.push(variant);
        break;
      }
    }
    return variant;
  }

  async function deleteVariant(variantId: string) {
    await api.deleteVariant(variantId);
    for (const script of scripts.value) {
      for (const track of script.tracks) {
        track.variants = track.variants.filter(
          (v) => v.id !== variantId,
        );
      }
    }
  }

  return {
    scripts,
    loading,
    error,
    fetchScripts,
    createScript,
    updateScript,
    deleteScript,
    reorderScripts,
    uploadTrack,
    deleteTrack,
    updateTrack,
    uploadVariant,
    deleteVariant,
  };
});
