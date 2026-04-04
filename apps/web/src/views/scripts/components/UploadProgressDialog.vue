<script setup lang="ts">
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export type UploadPhase = 'uploading' | 'done' | 'error';

const props = defineProps<{
  visible: boolean;
  phase: UploadPhase;
  currentFileName: string;
  currentIndex: number;
  total: number;
  successCount: number;
  failedCount: number;
}>();

const emit = defineEmits<{ 'update:visible': [value: boolean] }>();
const { t } = useI18n();

const overallPercent = computed(() =>
  props.total > 0
    ? Math.round(
        ((props.currentIndex - (props.phase === 'uploading' ? 1 : 0)) /
          props.total) *
          100,
      )
    : 0,
);

const statusMessage = computed(() => {
  if (props.phase === 'done' && props.failedCount === 0) {
    return t('uploadDialog.done');
  }
  if (props.phase === 'done' || props.phase === 'error') {
    return t('uploadDialog.doneWithErrors', {
      success: props.successCount,
      failed: props.failedCount,
    });
  }
  return t('uploadDialog.uploading', {
    current: props.currentIndex,
    total: props.total,
  });
});
</script>

<template>
  <Dialog
    :visible="props.visible"
    :closable="props.phase !== 'uploading'"
    :modal="true"
    :draggable="false"
    :header="t('uploadDialog.dialogTitle')"
    class="w-[90vw] md:w-100 rounded-2xl overflow-hidden"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4 p-2 text-center items-center">
      <i
        v-if="phase === 'done' && failedCount === 0"
        class="pi pi-check-circle text-5xl text-green-500 mb-2"
      />
      <i
        v-else-if="phase === 'error' || (phase === 'done' && failedCount > 0)"
        class="pi pi-exclamation-circle text-5xl text-amber-500 mb-2"
      />
      <i v-else class="pi pi-upload pi-spin text-5xl text-primary-500 mb-2" />

      <p class="font-semibold text-surface-800 dark:text-surface-100">
        {{ statusMessage }}
      </p>

      <!-- Overall progress bar -->
      <div class="w-full flex flex-col gap-1 text-left">
        <span
          class="text-xs font-medium text-surface-500 dark:text-surface-400"
        >
          {{
            t('uploadDialog.uploading', {
              current:
                phase === 'uploading'
                  ? currentIndex
                  : successCount + failedCount,
              total,
            })
          }}
        </span>
        <ProgressBar
          :value="phase === 'uploading' ? overallPercent : 100"
          style="height: 10px"
          class="w-full rounded-full"
        >
          <span class="text-[10px]"
            >{{ phase === 'uploading' ? overallPercent : 100 }}%</span
          >
        </ProgressBar>
      </div>

      <!-- Current file name (only while uploading) -->
      <div v-if="phase === 'uploading'" class="w-full text-left">
        <span
          class="text-xs text-surface-500 dark:text-surface-400 truncate block"
        >
          {{ t('uploadDialog.fileName', { name: currentFileName }) }}
        </span>
        <ProgressBar
          mode="indeterminate"
          style="height: 6px"
          class="w-full rounded-full mt-1"
        />
      </div>
    </div>

    <template #footer>
      <Button
        v-if="phase !== 'uploading'"
        :label="t('uploadDialog.closeButton')"
        icon="pi pi-times"
        class="w-full rounded-xl font-bold"
        severity="secondary"
        @click="emit('update:visible', false)"
      />
    </template>
  </Dialog>
</template>
