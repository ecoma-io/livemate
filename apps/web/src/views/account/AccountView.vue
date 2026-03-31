<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { usePageHeader } from '../../composables/usePageHeader';
import { useLayoutStore, type ColorScheme } from '../../stores/layout';
import { useAuthStore } from '../../stores/auth';
import type { AppLocale } from '../../locales';

const { t } = useI18n();
const layout = useLayoutStore();
const auth = useAuthStore();
const router = useRouter();

usePageHeader(t('account.pageTitle'));

const localeOptions = computed(() => [
  { label: t('account.languageAuto'), value: 'auto' as AppLocale },
  { label: t('account.languageEn'), value: 'en' as AppLocale },
  { label: t('account.languageVi'), value: 'vi' as AppLocale },
]);

const themeOptions = computed(() => [
  { label: t('theme.auto'), value: 'auto' as ColorScheme },
  { label: t('theme.light'), value: 'light' as ColorScheme },
  { label: t('theme.dark'), value: 'dark' as ColorScheme },
]);

const selectedLocale = computed({
  get: () => layout.locale,
  set: (v: AppLocale) => layout.setLocale(v),
});

const selectedTheme = computed({
  get: () => layout.colorScheme,
  set: (v: ColorScheme) => layout.setColorScheme(v),
});

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="flex flex-col gap-6 p-5 max-w-lg">
    <!-- Language -->
    <div class="flex flex-col gap-2">
      <label
        class="font-semibold text-sm text-surface-700 dark:text-surface-300"
        for="locale-select"
      >
        {{ t('account.languageLabel') }}
      </label>
      <Select
        id="locale-select"
        v-model="selectedLocale"
        :options="localeOptions"
        option-label="label"
        option-value="value"
        data-testid="locale-select"
        class="w-full"
      />
    </div>

    <!-- Display Mode -->
    <div class="flex flex-col gap-2">
      <label
        class="font-semibold text-sm text-surface-700 dark:text-surface-300"
        for="theme-select"
      >
        {{ t('account.displayModeLabel') }}
      </label>
      <Select
        id="theme-select"
        v-model="selectedTheme"
        :options="themeOptions"
        option-label="label"
        option-value="value"
        data-testid="theme-select"
        class="w-full"
      />
    </div>

    <!-- Logout -->
    <div class="pt-4 border-t border-surface-200 dark:border-surface-700">
      <Button
        :label="t('account.logoutButton')"
        icon="pi pi-sign-out"
        severity="danger"
        outlined
        data-testid="logout-button"
        class="w-full"
        @click="logout"
      />
    </div>
  </div>
</template>
