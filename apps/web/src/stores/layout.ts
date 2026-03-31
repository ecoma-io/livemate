import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { setAppLocale, type AppLocale } from '../locales';

export type ColorScheme = 'light' | 'dark' | 'auto';

const SCHEME_STORAGE_KEY = 'livemate-color-scheme';
const LOCALE_STORAGE_KEY = 'livemate-locale';

export const useLayoutStore = defineStore('layout', () => {
  const pageTitle = ref('LiveMate');
  const subHeaderVisible = ref(false);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const colorScheme = ref<ColorScheme>(
    (localStorage.getItem(SCHEME_STORAGE_KEY) as ColorScheme) ?? 'auto',
  );

  const systemDark = ref(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  const isDark = computed(() => {
    if (colorScheme.value === 'dark') return true;
    if (colorScheme.value === 'light') return false;
    return systemDark.value; // 'auto'
  });

  function setColorScheme(scheme: ColorScheme) {
    colorScheme.value = scheme;
    localStorage.setItem(SCHEME_STORAGE_KEY, scheme);
  }

  // Listen for OS preference changes (relevant while scheme === 'auto')
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', (e) => {
    systemDark.value = e.matches;
  });

  // Apply / remove .app-dark on <html> — drives both PrimeVue and TailwindCSS
  watch(
    isDark,
    (dark) => {
      document.documentElement.classList.toggle('app-dark', dark);
    },
    { immediate: true },
  );

  // ── Locale ─────────────────────────────────────────────────────────────────
  const locale = ref<AppLocale>(
    (localStorage.getItem(LOCALE_STORAGE_KEY) as AppLocale) ?? 'auto',
  );

  function setLocale(newLocale: AppLocale) {
    locale.value = newLocale;
    setAppLocale(newLocale);
  }

  return {
    pageTitle,
    subHeaderVisible,
    colorScheme,
    isDark,
    setColorScheme,
    locale,
    setLocale,
  };
});
