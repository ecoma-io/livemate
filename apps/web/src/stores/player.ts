import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useScriptsStore } from './scripts';
import { audioService } from '../services/audio';
import { api } from '../services/api';

export const usePlayerStore = defineStore('player', () => {
  const scriptsStore = useScriptsStore();

  const currentSpeed = ref(1.0);
  const isPlaying = ref(false);
  const activeScriptId = ref<string | null>(null);
  const lastPlayedVariant = ref<Record<string, string>>({});
  const volume = ref(1.0);

  function setSpeed(speed: number) {
    currentSpeed.value = speed;
  }

  function setVolume(v: number) {
    volume.value = v;
    audioService.setVolume(v);
  }

  function play(scriptId: string) {
    if (isPlaying.value) return;
    const script = scriptsStore.scripts.find((g) => g.id === scriptId);
    if (!script) return;

    // Collect all variants for the current speed across all tracks in this script
    const variants = script.tracks
      .flatMap((t) => t.variants)
      .filter((v) => v.speed === currentSpeed.value);

    if (variants.length === 0) return;

    // Exclude last played variant for this script
    const lastId = lastPlayedVariant.value[scriptId];
    let pool = variants.filter((v) => v.id !== lastId);
    if (pool.length === 0) pool = variants; // Only one variant, allow replay

    // Random selection
    const selected = pool[Math.floor(Math.random() * pool.length)];
    lastPlayedVariant.value[scriptId] = selected.id;

    // Stop current and play new
    const url = api.audioUrl(selected.id);
    audioService.play(url, () => {
      isPlaying.value = false;
      activeScriptId.value = null;
    }, selected.mimeType);

    isPlaying.value = true;
    activeScriptId.value = scriptId;
  }

  function stop() {
    audioService.stop();
    isPlaying.value = false;
    activeScriptId.value = null;
  }

  return {
    currentSpeed,
    isPlaying,
    activeScriptId,
    volume,
    setSpeed,
    setVolume,
    play,
    stop,
  };
});
