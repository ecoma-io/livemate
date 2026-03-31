<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';

const PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
  '#6b7280',
  '#78716c',
  '#dc2626',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
];

const props = defineProps<{
  visible: boolean;
  scriptId: string;
  currentColor: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  colorChange: [id: string, color: string];
}>();

const { t } = useI18n();

function selectColor(color: string) {
  emit('colorChange', props.scriptId, color);
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    :modal="true"
    :draggable="false"
    :header="t('audioGroupCard.colorPickerDialogTitle')"
    class="w-auto"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="grid grid-cols-6 gap-2 p-1">
      <button
        v-for="color in PALETTE"
        :key="color"
        type="button"
        class="w-9 h-9 rounded-lg transition-all active:scale-90 border-2"
        :style="{ backgroundColor: color }"
        :class="
          props.currentColor === color
            ? 'border-surface-0 dark:border-white scale-110 shadow-md ring-2 ring-primary-400 ring-offset-1 ring-offset-surface-0 dark:ring-offset-surface-800'
            : 'border-transparent hover:scale-105'
        "
        @click="selectColor(color)"
      />
    </div>
  </Dialog>
</template>
