<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ScriptData } from '../../../stores/scripts';

defineProps<{
  script: ScriptData;
  isActive: boolean;
  isAnyPlaying: boolean;
  countdown: number | null;
}>();

const emit = defineEmits<{ play: [id: string] }>();

const { t } = useI18n();

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
</script>

<template>
  <button
    class="relative overflow-hidden rounded-2xl flex flex-col items-center justify-center p-5 transition-all duration-200 shadow-xl"
    :style="{ backgroundColor: script.color || '#2e1065' }"
    :class="
      isActive
        ? 'ring-4 ring-white ring-offset-4 ring-offset-surface-950 shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95'
        : isAnyPlaying
          ? 'opacity-30 cursor-not-allowed pointer-events-none'
          : 'hover:brightness-110 active:scale-95'
    "
    @click="emit('play', script.id)"
  >
    <span
      class="text-xl md:text-2xl font-bold text-white text-center leading-tight drop-shadow-md z-10"
    >
      {{ script.name }}
    </span>

    <!-- Countdown badge when active and duration is known -->
    <span
      v-if="isActive && countdown !== null"
      data-testid="countdown"
      class="mt-2 text-lg font-mono font-bold tabular-nums text-white/90 drop-shadow-md z-10"
      :aria-label="
        t('studio.countdownAriaLabel', { time: formatCountdown(countdown) })
      "
    >
      {{ formatCountdown(countdown) }}
    </span>

    <!-- Ripple wave animation when active -->
    <div
      v-if="isActive"
      class="absolute inset-0 flex items-center justify-center gap-1.5 opacity-30 z-0"
    >
      <div
        v-for="i in 5"
        :key="i"
        class="w-3 bg-white auto-height-bounce rounded-full"
        :style="{ animationDelay: i * 0.1 + 's' }"
      />
    </div>
  </button>
</template>

<style scoped>
@keyframes height-bounce {
  0%,
  100% {
    height: 10%;
  }
  50% {
    height: 80%;
  }
}
.auto-height-bounce {
  animation: height-bounce 0.8s infinite ease-in-out;
}
</style>
