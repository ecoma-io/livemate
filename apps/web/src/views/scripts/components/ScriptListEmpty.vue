<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';

defineEmits(['addScript']);
const { t } = useI18n();
</script>

<template>
  <div
    class="text-center flex flex-col items-center justify-center p-8 min-h-[60vh] rounded-3xl border-2 border-dashed border-surface-200 dark:border-surface-700/60 bg-transparent flex-1"
  >
    <div
      class="w-16 h-16 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mb-4"
    >
      <i class="pi pi-folder-open text-3xl text-surface-400 dark:text-surface-500" />
    </div>
    <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">
      {{ t('soundboardEmpty.heading') }}
    </h3>
    <p class="text-surface-500 max-w-70">
      {{ t('soundboardEmpty.description') }}
    </p>
    <Button
      :label="t('soundboardEmpty.ctaButton')"
      icon="pi pi-plus"
      size="small"
      class="mt-6 rounded-xl font-semibold shadow-sm"
      @click="$emit('addScript')"
    />
  </div>
</template>
