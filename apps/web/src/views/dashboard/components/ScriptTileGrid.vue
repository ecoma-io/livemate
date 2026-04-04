<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ScriptData } from '../../../stores/scripts';
import ScriptTile from './ScriptTile.vue';

defineProps<{
  scripts: ScriptData[];
  activeScriptId: string | null;
  currentSpeed: number;
  isPlaying: boolean;
  countdown: number | null;
}>();

const emit = defineEmits<{ play: [id: string] }>();
const { t } = useI18n();
</script>

<template>
  <!-- Script Tiles Grid -->
  <div
    v-if="scripts.length > 0"
    class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 w-full pb-6"
  >
    <ScriptTile
      v-for="script in scripts"
      :key="script.id"
      :script="script"
      :is-active="activeScriptId === script.id"
      :is-any-playing="isPlaying"
      :countdown="activeScriptId === script.id ? countdown : null"
      @play="emit('play', $event)"
    />
  </div>

  <!-- Empty state -->
  <div
    v-else
    class="flex-1 flex flex-col items-center justify-center text-surface-500 text-center gap-4 w-full"
  >
    <div
      class="w-24 h-24 rounded-full border-2 border-dashed border-surface-300 dark:border-surface-600 flex items-center justify-center mb-2"
    >
      <i class="pi pi-exclamation-triangle text-4xl" />
    </div>
    <p class="font-medium">
      {{ t('studio.noAudioForSpeed', { speed: currentSpeed }) }}
    </p>
    <p class="text-sm">
      {{ t('studio.goToSoundboard') }}
    </p>
  </div>
</template>
