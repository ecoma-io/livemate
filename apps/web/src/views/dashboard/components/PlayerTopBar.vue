<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Slider from 'primevue/slider';
import { useLayoutStore } from '../../../stores/layout';
import type { SPEEDS } from '../../../config/speeds';

const props = defineProps<{
  isActive: boolean;
  isPlaying: boolean;
  speeds: typeof SPEEDS;
  currentSpeed: number;
  volume: number;
}>();

const emit = defineEmits<{
  speedChange: [value: number];
  volumeChange: [value: number];
  stop: [];
}>();

const { t } = useI18n();
const layout = useLayoutStore();

// Scale speed to integers (×10) to avoid floating-point slider issues
const speedModel = computed({
  get: () => Math.round(props.currentSpeed * 10),
  set: (val: number) => emit('speedChange', val / 10),
});

const speedMin = computed(() => Math.round(props.speeds[0].value * 10));
const speedMax = computed(() => Math.round(props.speeds[props.speeds.length - 1].value * 10));

const volumeModel = computed({
  get: () => Math.round(props.volume * 100),
  set: (val: number) => { emit('volumeChange', val / 100); },
});

const volumeIcon = computed(() => {
  if (props.volume === 0) return 'pi-volume-off';
  if (props.volume < 0.5) return 'pi-volume-down';
  return 'pi-volume-up';
});

// Show sub-header row whenever this view is active
watch(
  () => props.isActive,
  (show) => { layout.subHeaderVisible = show; },
  { immediate: true },
);

onUnmounted(() => { layout.subHeaderVisible = false; });
</script>

<template>
  <!-- Stop button → main header right side -->
  <Teleport
    v-if="isActive && isPlaying"
    to="#topbar-actions"
  >
    <button
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-full
             bg-red-600/15 text-red-400 border border-red-500/40
             text-xs font-bold uppercase tracking-wide
             hover:bg-red-600/25 active:scale-95 transition-all select-none"
      @click="emit('stop')"
    >
      <i class="pi pi-stop-circle text-xs" />
      <span>{{ t('studio.stopButtonActive') }}</span>
    </button>
  </Teleport>

  <!-- Speed + Volume → sub-header row -->
  <Teleport
    v-if="isActive"
    to="#topbar-secondary"
  >
    <div class="flex gap-6 md:gap-10 w-full md:max-w-2xl md:mx-auto">
      <!-- Speed slider: flex-1 gives equal 50/50 split with volume -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <i class="pi pi-gauge text-primary-300 md:text-primary-500 shrink-0" />
        <Slider
          v-model="speedModel"
          :min="speedMin"
          :max="speedMax"
          :step="1"
          class="flex-1 min-w-0"
          pt:root="{class: 'h-2 bg-white/20 md:bg-surface-200 md:dark:bg-surface-600 rounded-full cursor-pointer'}"
          pt:range="{class: 'bg-primary-400 md:bg-primary-500 rounded-full'}"
          pt:handle="{class: 'w-5 h-5 bg-white border-2 border-primary-400 md:border-primary-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)] md:shadow-md transition-transform duration-100 active:scale-110 cursor-grab'}"
        />
        <span
          class="text-xs font-bold font-mono tabular-nums shrink-0
                     bg-primary-400/20 text-primary-200 border border-primary-400/30 px-1.5 py-0.5 rounded-md
                     md:bg-primary-50 md:text-primary-600 md:border-primary-200 md:dark:bg-primary-900/30 md:dark:text-primary-400 md:dark:border-primary-700/50"
        >
          {{ currentSpeed.toFixed(1) }}x
        </span>
      </div>

      <!-- Volume slider: flex-1 mirrors speed group structure [icon + slider + badge] -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <i
          class="pi text-white/60 md:text-surface-400 shrink-0 w-4 text-center"
          :class="volumeIcon"
        />
        <Slider
          v-model="volumeModel"
          :min="0"
          :max="100"
          :step="5"
          class="flex-1 min-w-0"
          pt:root="{class: 'h-2 bg-white/20 md:bg-surface-200 md:dark:bg-surface-600 rounded-full cursor-pointer'}"
          pt:range="{class: 'bg-white/70 md:bg-primary-500 rounded-full'}"
          pt:handle="{class: 'w-5 h-5 bg-white border-2 border-white/80 md:border-primary-500 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)] md:shadow-md transition-transform duration-100 active:scale-110 cursor-grab'}"
        />
        <span
          class="text-xs font-bold font-mono tabular-nums shrink-0
                     bg-white/10 text-white/70 border border-white/20 px-1.5 py-0.5 rounded-md
                     md:bg-primary-50 md:text-primary-600 md:border-primary-200 md:dark:bg-primary-900/30 md:dark:text-primary-400 md:dark:border-primary-700/50"
        >
          {{ volumeModel }}%
        </span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Center the 20px handle (h-5) on the 8px track (h-2).
   PrimeVue uses top: 50% + margin-top: -(handle-height/2) via CSS var.
   We override margin-top to -(20px/2) = -10px to match our custom size. */
:deep(.p-slider-handle) {
  margin-top: -10px !important;
}
</style>
