<script setup lang="ts">
import { onMounted, ref, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useScriptsStore, type TrackData } from '../../stores/scripts';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { usePageHeader } from '../../composables/usePageHeader';
import { useAudioRenderer } from '../../composables/useAudioRenderer';
import { RENDER_SPEEDS } from '../../config/speeds';
import draggable from 'vuedraggable';
import Skeleton from 'primevue/skeleton';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import ConfirmDialog from 'primevue/confirmdialog';
import ScriptForm from './components/ScriptForm.vue';
import ScriptCard from './components/ScriptCard.vue';
import ScriptListEmpty from './components/ScriptListEmpty.vue';
import RenderProgressDialog from './components/RenderProgressDialog.vue';

const store = useScriptsStore();
const toast = useToast();
const confirm = useConfirm();
const { t } = useI18n();
const { isActive } = usePageHeader(t('soundboardView.pageTitle'));
const showNewScriptDialog = ref(false);
const isSortMode = ref(false);
const expandedScriptId = ref<string | null>(null);
const menu = ref();
const SKELETON_COUNT_KEY = 'scripts-skeleton-count';
const skeletonCount = ref(
  parseInt(localStorage.getItem(SKELETON_COUNT_KEY) ?? '3', 10),
);
const {
  isRendering,
  dialogVisible,
  fileName,
  speed: renderSpeed,
  progress,
  phase,
  phaseLabel,
  errorMessage,
  sessionTotal,
  sessionCompleted,
  sessionErrorCount,
  queueRenderVariant,
} = useAudioRenderer();

onMounted(async () => {
  await store.fetchScripts();
  if (store.scripts.length > 0) {
    localStorage.setItem(SKELETON_COUNT_KEY, String(store.scripts.length));
    skeletonCount.value = store.scripts.length;
  }
});

function handleDeleteScript(id: string) {
  confirm.require({
    message: t('soundboardView.confirmDeleteGroup.message'),
    header: t('soundboardView.confirmDeleteGroup.header'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: t('soundboardView.common.cancel'),
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: { label: t('soundboardView.common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await store.deleteScript(id);
        toast.add({
          severity: 'success',
          summary: t('soundboardView.toast.deleteGroupSuccess'),
          life: 2000,
        });
      } catch (e) {
        toast.add({
          severity: 'error',
          summary: t('soundboardView.toast.uploadError'),
          detail: (e as Error).message,
          life: 3000,
        });
      }
    },
  });
}

function handleToggleExpand(scriptId: string) {
  expandedScriptId.value =
    expandedScriptId.value === scriptId ? null : scriptId;
}

async function handleScriptCreated(id: string) {
  expandedScriptId.value = id;
  await nextTick();
  const el = document.querySelector(`[data-script-id="${id}"]`) as HTMLElement | null;
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleFileNameChange(fileId: string, name: string) {
  await store.updateTrack(fileId, { name });
}

async function handleScriptColorChange(id: string, color: string) {
  await store.updateScript(id, { color });
}

async function handleDragEnd() {
  const items = store.scripts.map((g, i) => ({ id: g.id, sortOrder: i }));
  await store.reorderScripts(items);
}

async function handleFileUpload(scriptId: string, files: File[]) {
  let successCount = 0;
  for (const file of files) {
    if (file.size > 2 * 1024 * 1024) {
      toast.add({
        severity: 'error',
        summary: t('soundboardView.toast.fileTooLarge'),
        detail: t('soundboardView.toast.fileTooLargeDetail', {
          filename: file.name,
        }),
        life: 3000,
      });
      continue;
    }
    try {
      await store.uploadTrack(scriptId, file);
      successCount++;
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: t('soundboardView.toast.uploadError'),
        detail: (e as Error).message,
        life: 3000,
      });
    }
  }
  if (successCount > 0) {
    toast.add({
      severity: 'success',
      summary: t('soundboardView.toast.uploadSuccess', { count: successCount }),
      life: 2000,
    });
  }
}

function handleDeleteFile(fileId: string) {
  confirm.require({
    message: t('soundboardView.confirmDeleteTrack.message'),
    header: t('soundboardView.confirmDeleteTrack.header'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: t('soundboardView.common.cancel'),
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: { label: t('soundboardView.common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await store.deleteTrack(fileId);
        toast.add({
          severity: 'success',
          summary: t('soundboardView.toast.deleteTrackSuccess'),
          life: 2000,
        });
      } catch (e) {
        toast.add({
          severity: 'error',
          summary: t('soundboardView.toast.uploadError'),
          detail: (e as Error).message,
          life: 3000,
        });
      }
    },
  });
}

function handleDeleteVariant(variantId: string) {
  confirm.require({
    message: t('soundboardView.confirmDeleteVariant.message'),
    header: t('soundboardView.confirmDeleteVariant.header'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: t('soundboardView.common.cancel'),
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: { label: t('soundboardView.common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await store.deleteVariant(variantId);
        toast.add({
          severity: 'success',
          summary: t('soundboardView.toast.deleteVariantSuccess'),
          life: 2000,
        });
      } catch (e) {
        toast.add({
          severity: 'error',
          summary: t('soundboardView.toast.uploadError'),
          detail: (e as Error).message,
          life: 3000,
        });
      }
    },
  });
}

function handleRenderVariant(file: TrackData, speed: number) {
  queueRenderVariant(file, speed);
}

function handleRenderAllMissing(
  items: Array<{ file: TrackData; speed: number }>,
) {
  for (const item of items) {
    queueRenderVariant(item.file, item.speed);
  }
}

function handleRenderAllMissingGlobally() {
  for (const script of store.scripts) {
    for (const track of script.tracks) {
      for (const speed of RENDER_SPEEDS) {
        const hasVariant = track.variants.some((v) => v.speed === speed);
        if (!hasVariant) {
          queueRenderVariant(track, speed);
        }
      }
    }
  }
}

const menuItems = computed(() => [
  {
    label: t('soundboardView.sortMode'),
    icon: 'pi pi-sort-alt',
    disabled: store.scripts.length === 0,
    command: () => {
      isSortMode.value = true;
    },
  },
  {
    label: t('soundboardView.addGroup'),
    icon: 'pi pi-plus',
    command: () => {
      showNewScriptDialog.value = true;
    },
  },
  {
    label: t('soundboardView.renderAllMissing'),
    icon: 'pi pi-bolt',
    command: handleRenderAllMissingGlobally,
  },
]);
</script>

<template>
  <div
    class="flex-1 min-h-0 flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-0"
  >
    <ConfirmDialog />
    <main
      class="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar"
      style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))"
    >
      <!-- Loading -->
      <div
        v-if="store.loading"
        class="flex flex-col gap-4"
      >
        <div
          v-for="i in skeletonCount"
          :key="i"
          class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
        >
          <div class="flex items-center gap-3 mb-4">
            <Skeleton
              width="1.5rem"
              height="1.5rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="2rem"
              height="2rem"
              border-radius="0.5rem"
            />
            <Skeleton
              width="10rem"
              height="1.25rem"
              border-radius="0.5rem"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Skeleton
              v-for="j in 2"
              :key="j"
              width="100%"
              height="2.5rem"
              border-radius="0.5rem"
            />
          </div>
          <Skeleton
            class="mt-3"
            width="100%"
            height="2.5rem"
            border-radius="0.75rem"
          />
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="store.error"
        class="flex flex-col items-center justify-center p-8 min-h-[60vh] rounded-3xl border-2 border-dashed border-red-200 dark:border-red-800/60"
      >
        <div
          class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4"
        >
          <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
        </div>
        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">
          {{ t('soundboardView.loadError') }}
        </h3>
        <p class="text-surface-500 max-w-70 text-center mb-6">
          {{ store.error }}
        </p>
        <Button
          :label="t('soundboardView.retryButton')"
          icon="pi pi-refresh"
          size="small"
          class="rounded-xl font-semibold shadow-sm"
          @click="store.fetchScripts()"
        />
      </div>

      <!-- Script List -->
      <template v-else-if="store.scripts.length > 0">
        <!-- Sort Mode: simplified draggable list -->
        <draggable
          v-if="isSortMode"
          :list="store.scripts"
          item-key="id"
          handle=".sort-drag-handle"
          class="flex flex-col gap-2"
          @end="handleDragEnd"
        >
          <template #item="{ element: script }">
            <div
              class="flex items-center gap-3 px-4 py-3 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm"
            >
              <div
                class="w-1 self-stretch rounded-full shrink-0"
                :style="{ backgroundColor: script.color }"
              />
              <span
                class="flex-1 font-semibold text-surface-900 dark:text-white truncate"
              >{{ script.name }}</span>
              <button
                class="sort-drag-handle text-surface-400 hover:text-surface-700 cursor-grab active:cursor-grabbing p-1 shrink-0"
                :aria-label="t('audioGroupCard.dragAriaLabel')"
              >
                <i class="pi pi-bars text-lg" />
              </button>
            </div>
          </template>
        </draggable>

        <!-- Normal Mode: ScriptCard list -->
        <div
          v-else
          class="flex flex-col gap-6"
        >
          <ScriptCard
            v-for="script in store.scripts"
            :key="script.id"
            :script="script"
            :is-rendering="isRendering"
            :is-expanded="expandedScriptId === script.id"
            @toggle-expand="handleToggleExpand(script.id)"
            @color-change="handleScriptColorChange"
            @file-upload="handleFileUpload"
            @delete-script="handleDeleteScript"
            @delete-track="handleDeleteFile"
            @delete-variant="handleDeleteVariant"
            @track-name-change="handleFileNameChange"
            @render-variant="handleRenderVariant"
            @render-all-missing="handleRenderAllMissing"
          />
        </div>
      </template>

      <ScriptListEmpty
        v-else
        @add-script="showNewScriptDialog = true"
      />
    </main>

    <ScriptForm
      v-model:visible="showNewScriptDialog"
      @script-created="handleScriptCreated"
    />

    <RenderProgressDialog
      v-model:visible="dialogVisible"
      :phase="phase"
      :progress="progress"
      :file-name="fileName"
      :speed="renderSpeed"
      :phase-label="phaseLabel"
      :error-message="errorMessage"
      :is-rendering="isRendering"
      :session-total="sessionTotal"
      :session-completed="sessionCompleted"
      :session-error-count="sessionErrorCount"
    />

    <!-- Teleport action buttons into the global top bar -->
    <Teleport
      v-if="isActive"
      to="#topbar-actions"
    >
      <template v-if="!isSortMode">
        <Button
          :aria-label="t('soundboardView.moreOptions')"
          icon="pi pi-ellipsis-v"
          severity="secondary"
          rounded
          text
          size="small"
          class="shadow-sm"
          @click="menu.toggle($event)"
        />
        <Menu
          ref="menu"
          :model="menuItems"
          popup
        />
      </template>
      <Button
        v-if="isSortMode"
        :label="t('soundboardView.sortModeDone')"
        icon="pi pi-check"
        severity="success"
        size="small"
        class="shadow-sm font-semibold rounded-xl"
        @click="isSortMode = false"
      />
    </Teleport>
  </div>
</template>
