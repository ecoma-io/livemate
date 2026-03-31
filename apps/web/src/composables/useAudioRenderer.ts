import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useScriptsStore, type TrackData } from '../stores/scripts';
import { ffmpegService } from '../services/ffmpeg';
import { api } from '../services/api';
import { useToast } from 'primevue/usetoast';

export type RenderPhase =
  | 'loading'
  | 'downloading'
  | 'rendering'
  | 'uploading'
  | 'done'
  | 'error';

export function useAudioRenderer() {
  const store = useScriptsStore();
  const toast = useToast();
  const { t } = useI18n({ useScope: 'global' });

  const isRendering = ref(false);
  const dialogVisible = ref(false);
  const fileName = ref('');
  const speed = ref(0);
  const progress = ref(0);
  const phase = ref<RenderPhase>('loading');
  const errorMessage = ref('');
  const renderQueue = ref<Array<{ file: TrackData; speed: number }>>([]);

  // Session tracking
  const sessionActive = ref(false);
  const sessionTotal = ref(0);
  const sessionCompleted = ref(0);
  const sessionErrorCount = ref(0);

  // Reset session when dialog is closed
  watch(dialogVisible, (newVal) => {
    if (!newVal) {
      sessionActive.value = false;
    }
  });

  const phaseLabel = computed(() => {
    switch (phase.value) {
      case 'loading':
        return t('processingDialog.phase.loading');
      case 'downloading':
        return t('processingDialog.phase.downloading');
      case 'rendering':
        return t('processingDialog.phase.rendering');
      case 'uploading':
        return t('processingDialog.phase.uploading');
      case 'error':
        return t('processingDialog.phase.error');
      case 'done':
        return t('processingDialog.phase.done');
      default:
        return '';
    }
  });

  async function renderVariant(file: TrackData, targetSpeed: number) {
    if (isRendering.value) return;

    isRendering.value = true;
    dialogVisible.value = true;
    fileName.value = file.name;
    speed.value = targetSpeed;
    progress.value = 0;
    errorMessage.value = '';

    try {
      if (!ffmpegService.isLoaded) {
        phase.value = 'loading';
        await ffmpegService.load();
      }

      const original = file.variants.find((v) => v.speed === 1.0);
      if (!original) throw new Error(t('audioRenderer.missingOriginalError'));

      phase.value = 'downloading';
      const res = await fetch(api.audioUrl(original.id));
      const originalBlob = await res.blob();

      phase.value = 'rendering';
      progress.value = 0;
      const renderedBlob = await ffmpegService.changeSpeed(
        originalBlob,
        targetSpeed,
        (p) => {
          progress.value = p;
        },
      );

      phase.value = 'uploading';
      progress.value = 100;
      await store.uploadVariant(file.id, targetSpeed, renderedBlob);

      sessionCompleted.value++;
      // If queue is empty, mark done and auto-close
      if (renderQueue.value.length === 0) {
        phase.value = 'done';
        setTimeout(() => {
          dialogVisible.value = false;
        }, 1000);
      }
    } catch (e) {
      if (sessionTotal.value <= 1) {
        // Single mode (or direct call): block and show error to user
        phase.value = 'error';
        errorMessage.value = (e as Error).message;
        toast.add({
          severity: 'error',
          summary: t('audioRenderer.toast.renderError'),
          detail: (e as Error).message,
          life: 3000,
        });
      } else {
        // Batch mode: skip, count and continue
        sessionErrorCount.value++;
        if (renderQueue.value.length === 0) {
          phase.value = 'done';
          setTimeout(() => {
            dialogVisible.value = false;
          }, 1000);
        }
      }
    } finally {
      isRendering.value = false;
    }
    // Process next item in queue
    tryProcessNext();
  }

  async function tryProcessNext() {
    if (isRendering.value || renderQueue.value.length === 0) return;
    const item = renderQueue.value.shift();
    if (!item) return;
    await renderVariant(item.file, item.speed);
  }

  function queueRenderVariant(file: TrackData, targetSpeed: number) {
    if (!sessionActive.value) {
      sessionActive.value = true;
      sessionTotal.value = 0;
      sessionCompleted.value = 0;
      sessionErrorCount.value = 0;
    }
    sessionTotal.value++;
    renderQueue.value.push({ file, speed: targetSpeed });
    tryProcessNext();
  }

  return {
    isRendering,
    dialogVisible,
    fileName,
    speed,
    progress,
    phase,
    phaseLabel,
    errorMessage,
    sessionTotal,
    sessionCompleted,
    sessionErrorCount,
    renderVariant,
    queueRenderVariant,
    renderQueue,
  };
}
