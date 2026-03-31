<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{
  open: boolean;
  currentRouteName?: string;
}>();

const emit = defineEmits<{
  navigate: [name: string];
  close: [];
}>();

const { t } = useI18n();

const navItems = computed(() => [
  { icon: 'pi pi-play-circle', label: t('nav.studio'), name: 'dashboard' },
  { icon: 'pi pi-file-edit', label: t('nav.soundboard'), name: 'scripts' },
  { icon: 'pi pi-user', label: t('nav.account'), name: 'account' },
]);
</script>

<template>
  <aside
    class="flex flex-col w-3/4 md:w-50 flex-none bg-surface-0 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 z-50 fixed inset-y-0 left-0 md:static transition-transform duration-300 ease-in-out"
    :class="
      open
        ? 'translate-x-0 shadow-2xl md:shadow-none'
        : '-translate-x-full md:translate-x-0'
    "
  >
    <!-- Branding -->
    <div
      class="cursor-pointer border-b border-surface-200 dark:border-surface-800 flex-none shrink-0"
      style="padding-top: env(safe-area-inset-top, 0px)"
      @click="emit('navigate', 'dashboard')"
    >
      <div class="h-18 md:h-14 px-5 flex items-center gap-3">
        <div
          class="w-10 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            fill="none"
            class="w-full h-full"
            aria-hidden="true"
          >
            <path
              d="M144 144 A 160 160 0 0 0 144 368"
              stroke="#8b5cf6"
              stroke-width="40"
              stroke-linecap="round"
              opacity="0.4"
            />
            <path
              d="M88 88 A 240 240 0 0 0 88 424"
              stroke="#8b5cf6"
              stroke-width="40"
              stroke-linecap="round"
              opacity="0.7"
            />
            <path
              d="M368 144 A 160 160 0 0 1 368 368"
              stroke="#8b5cf6"
              stroke-width="40"
              stroke-linecap="round"
              opacity="0.4"
            />
            <path
              d="M424 88 A 240 240 0 0 1 424 424"
              stroke="#8b5cf6"
              stroke-width="40"
              stroke-linecap="round"
              opacity="0.7"
            />
            <circle
              cx="256"
              cy="256"
              r="100"
              fill="#8b5cf6"
            />
            <polygon
              points="230,200 230,312 310,256"
              fill="#ffffff"
            />
          </svg>
        </div>
        <span
          class="font-bold text-2xl md:text-lg tracking-tight text-surface-900 dark:text-surface-0 truncate"
        >Live Mate</span>
      </div>
    </div>

    <!-- Nav -->
    <nav
      class="flex-1 flex flex-col gap-1 p-3 pt-4 overflow-y-auto no-scrollbar"
    >
      <button
        v-for="item in navItems"
        :key="item.name"
        class="flex items-center gap-3 px-3 py-3 rounded-xl text-lg md:text-sm font-semibold transition-all duration-200 w-full text-left touch-manipulation active:scale-[0.98]"
        :class="
          currentRouteName === item.name
            ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
        "
        @click="emit('navigate', item.name)"
      >
        <i
          :class="item.icon"
          class="text-2xl md:text-lg shrink-0"
        />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div
      class="flex-none"
      style="padding-bottom: env(safe-area-inset-bottom, 0px)"
    />
  </aside>
</template>
