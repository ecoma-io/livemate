<script setup lang="ts">
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RenderPhase } from '../../../composables/useAudioRenderer';

const props = defineProps<{
  visible: boolean;
  phase: RenderPhase;
  progress: number;
  fileName: string;
  speed: number;
  phaseLabel: string;
  errorMessage: string;
  isRendering: boolean;
  sessionTotal: number;
  sessionCompleted: number;
  sessionErrorCount: number;
}>();

const emit = defineEmits<{ 'update:visible': [value: boolean] }>();
const { t } = useI18n();

const isBatch = computed(() => props.sessionTotal > 1);
const overallPercent = computed(() =>
  props.sessionTotal > 0
    ? Math.round((props.sessionCompleted / props.sessionTotal) * 100)
    : 0,
);
</script>

<template>
  <Dialog
    :visible="props.visible"
    :closable="!props.isRendering"
    :modal="true"
    :draggable="false"
    :header="t('processingDialog.dialogTitle')"
    class="w-[90vw] md:w-100 rounded-2xl overflow-hidden"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4 p-2 text-center items-center">
      <i
        v-if="phase === 'done'"
        class="pi pi-check-circle text-5xl text-green-500 mb-2"
      />
      <i
        v-else-if="phase === 'error'"
        class="pi pi-times-circle text-5xl text-red-500 mb-2"
      />
      <i
        v-else
        class="pi pi-cog pi-spin text-5xl text-primary-500 mb-2"
      />

      <!-- Batch mode: 2 progress bars -->
      <template v-if="isBatch">
        <div class="w-full flex flex-col gap-1 text-left">
          <span class="text-xs font-medium text-surface-500 dark:text-surface-400">
            {{ t('processingDialog.filesProgress', { completed: sessionCompleted, total: sessionTotal }) }}
          </span>
          <ProgressBar
            :value="overallPercent"
            style="height: 10px"
            class="w-full rounded-full"
          >
            <span class="text-[10px]">{{ sessionCompleted }}/{{ sessionTotal }}</span>
          </ProgressBar>
        </div>

        <div class="w-full flex flex-col gap-1 text-left">
          <span class="text-xs font-medium text-surface-500 dark:text-surface-400">
            {{ t('processingDialog.currentFile') }}: {{ fileName }} ({{ speed }}x)
          </span>
          <ProgressBar
            :value="phase === 'done' ? 100 : Math.round(progress)"
            style="height: 10px"
            class="w-full rounded-full"
          >
            <span class="text-[10px]">{{ Math.round(progress) }}%</span>
          </ProgressBar>
        </div>
      </template>

      <!-- Single mode: 1 progress bar -->
      <template v-else>
        <h3 class="font-bold">
          {{ fileName }} ({{ speed }}x)
        </h3>

        <ProgressBar
          :value="phase === 'done' ? 100 : Math.round(progress)"
          style="height: 12px"
          class="w-full rounded-full"
        >
          <span class="text-[10px]">{{ Math.round(progress) }}%</span>
        </ProgressBar>
      </template>

      <p
        class="text-sm font-medium text-surface-600 dark:text-surface-300"
        :class="{ 'text-red-500': phase === 'error' }"
      >
        {{ phaseLabel }}
      </p>

      <!-- Error message (single mode) -->
      <p
        v-if="errorMessage"
        class="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg wrap-break-words w-full"
      >
        {{ errorMessage }}
      </p>

      <!-- Error count badge (batch mode) -->
      <p
        v-if="isBatch && sessionErrorCount > 0"
        class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg w-full text-left"
      >
        <i class="pi pi-exclamation-triangle mr-1" />
        {{ t('processingDialog.errorCount', { count: sessionErrorCount }) }}
      </p>
    </div>

    <!-- Footer: only for single-mode error -->
    <template
      v-if="phase === 'error' && !isBatch"
      #footer
    >
      <Button
        :label="t('processingDialog.closeButton')"
        icon="pi pi-times"
        severity="secondary"
        class="w-full rounded-xl font-semibold"
        @click="emit('update:visible', false)"
      />
    </template>
  </Dialog>
</template>
