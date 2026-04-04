<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useScriptsStore } from '../../stores/scripts';
import { usePlayerStore } from '../../stores/player';
import { usePageHeader } from '../../composables/usePageHeader';
import { useWakeLock } from '../../composables/useWakeLock';
import { useMediaSession } from '../../composables/useMediaSession';
import { SPEEDS } from '../../config/speeds';
import ScriptTileGrid from './components/ScriptTileGrid.vue';
import PlayerTopBar from './components/PlayerTopBar.vue';

const scriptsStore = useScriptsStore();
const player = usePlayerStore();
const { t } = useI18n();
const { isActive } = usePageHeader(t('studio.pageTitle'));

useWakeLock();
useMediaSession(() => {
  if (player.isPlaying) player.stop();
});

const scriptsWithVariants = computed(() =>
  scriptsStore.scripts.filter((g) =>
    g.tracks.some((t) =>
      t.variants.some((v) => v.speed === player.currentSpeed),
    ),
  ),
);

onMounted(() => {
  scriptsStore.fetchScripts();
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_AUDIO' });
  }
});

function playTrack(scriptId: string) {
  if ('vibrate' in navigator) navigator.vibrate(50);
  player.play(scriptId);
}

function handleStop() {
  if (!player.isPlaying) return;
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
  player.stop();
}
</script>

<template>
  <div
    class="flex-1 min-h-0 flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-white select-none font-sans overflow-hidden"
  >
    <div
      class="flex-1 min-h-0 overflow-y-auto px-4 py-6 no-scrollbar flex flex-col items-center"
    >
      <!-- Loading -->
      <div v-if="scriptsStore.loading" class="flex items-center justify-center">
        <i class="pi pi-spinner pi-spin text-4xl text-primary-500" />
      </div>

      <!-- Error -->
      <div
        v-else-if="scriptsStore.error"
        class="flex flex-col items-center justify-center gap-4 text-center"
      >
        <div
          class="w-20 h-20 rounded-full border-2 border-dashed border-red-500/50 flex items-center justify-center"
        >
          <i class="pi pi-exclamation-triangle text-3xl text-red-400" />
        </div>
        <p class="font-medium text-red-400">
          {{ t('studio.loadError') }}
        </p>
        <button
          class="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/25 active:scale-95 transition-all"
          @click="scriptsStore.fetchScripts()"
        >
          {{ t('studio.retryButton') }}
        </button>
      </div>

      <ScriptTileGrid
        v-else
        :scripts="scriptsWithVariants"
        :active-script-id="player.activeScriptId"
        :current-speed="player.currentSpeed"
        :is-playing="player.isPlaying"
        :countdown="player.countdown"
        @play="playTrack"
      />
    </div>

    <PlayerTopBar
      :is-active="isActive"
      :is-playing="player.isPlaying"
      :speeds="SPEEDS"
      :current-speed="player.currentSpeed"
      :volume="player.volume"
      @speed-change="player.setSpeed"
      @volume-change="player.setVolume"
      @stop="handleStop"
    />
  </div>
</template>
