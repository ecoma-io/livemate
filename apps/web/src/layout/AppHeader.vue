<script setup lang="ts">
import { useLayoutStore } from '../stores/layout';

defineProps<{ title: string }>();

const emit = defineEmits<{ toggleDrawer: [] }>();
const layout = useLayoutStore();
</script>

<template>
  <header
    class="flex-none shrink-0 flex flex-col bg-primary-800 md:bg-surface-0/95 md:dark:bg-surface-900/95 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800 z-30"
    style="padding-top: env(safe-area-inset-top, 0px)"
  >
    <div class="h-18 md:h-14 flex items-center gap-2 px-3 md:px-5">
      <button
        class="md:hidden p-2 -ml-1 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors active:scale-95 touch-manipulation shrink-0"
        @click="emit('toggleDrawer')"
      >
        <i class="pi pi-bars text-xl" />
      </button>
      <h1
        class="font-bold text-lg tracking-tight text-white md:text-surface-900 md:dark:text-surface-0 truncate"
      >
        {{ title }}
      </h1>
      <div
        id="topbar-actions"
        class="ml-auto flex items-center gap-2 shrink-0"
      />
    </div>

    <!-- Sub-header row: always in DOM so Teleport targets resolve, visibility toggled via v-show -->
    <div
      v-show="layout.subHeaderVisible"
      id="topbar-secondary"
      class="h-12 flex items-center gap-3 px-5 border-t border-white/10 md:border-surface-200 md:dark:border-surface-800 bg-primary-900 md:bg-surface-50/95 md:dark:bg-surface-900/95"
    />
  </header>
</template>

<style scoped></style>
