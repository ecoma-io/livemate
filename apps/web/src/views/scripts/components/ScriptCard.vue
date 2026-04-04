<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ScriptForm from './ScriptForm.vue';
import ScriptColorDialog from './ScriptColorDialog.vue';
import type { ScriptData, TrackData } from '../../../stores/scripts';
import { SPEEDS, RENDER_SPEEDS } from '../../../config/speeds';
import { API_BASE_URL } from '../../../config/apiConfig';

const props = defineProps<{
  script: ScriptData;
  isRendering: boolean;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  colorChange: [id: string, color: string];
  fileUpload: [scriptId: string, files: File[]];
  deleteScript: [id: string];
  deleteTrack: [fileId: string];
  deleteVariant: [variantId: string];
  trackNameChange: [fileId: string, name: string];
  renderVariant: [file: TrackData, speed: number];
  renderAllMissing: [items: Array<{ file: TrackData; speed: number }>];
  toggleExpand: [];
}>();

const colorDialogVisible = ref(false);
const { t } = useI18n();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
const playingFileId = ref<string | null>(null);
const playingSpeed = ref<number>(1.0);
const audioEl = ref<HTMLAudioElement | null>(null);
const renameDialogVisible = ref(false);
const editingFileId = ref<string | null>(null);
const editingFileName = ref('');
const fileNameInputRef = ref<HTMLInputElement | null>(null);

const missingVariants = computed(() => {
  const items: Array<{ file: TrackData; speed: number }> = [];
  for (const file of props.script.tracks) {
    for (const speed of RENDER_SPEEDS) {
      if (!file.variants.some((v) => v.speed === speed)) {
        items.push({ file, speed });
      }
    }
  }
  return items;
});

function hasVariant(file: TrackData, speed: number): boolean {
  return file.variants.some((v) => v.speed === speed);
}

function getVariantId(file: TrackData, speed: number): string | null {
  return file.variants.find((v) => v.speed === speed)?.id ?? null;
}

function getVariantDuration(file: TrackData, speed: number): number | null {
  const d = file.variants.find((v) => v.speed === speed)?.duration;
  return d != null && d > 0 ? d : null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getVariantUrl(file: TrackData, speed: number): string | null {
  const variant = file.variants.find((v) => v.speed === speed);
  if (!variant) return null;
  return `${API_BASE_URL}/audio/${variant.id}`;
}

function togglePlay(file: TrackData, speed?: number) {
  const url = getVariantUrl(file, speed ?? 1.0);
  if (!url) return;
  const isSameTrack =
    playingFileId.value === file.id && playingSpeed.value === (speed ?? 1.0);
  if (isSameTrack) {
    audioEl.value?.pause();
    playingFileId.value = null;
  } else {
    audioEl.value?.pause();
    playingFileId.value = file.id;
    playingSpeed.value = speed ?? 1.0;
    if (audioEl.value) {
      audioEl.value.src = url;
      audioEl.value.play();
    }
  }
}

function startEditingFileName(fileId: string, currentName: string) {
  editingFileId.value = fileId;
  editingFileName.value = currentName;
  setTimeout(() => fileNameInputRef.value?.focus(), 0);
}

function commitFileName() {
  const fileId = editingFileId.value;
  if (fileId && editingFileName.value.trim()) {
    const file = props.script.tracks.find((f) => f.id === fileId);
    if (file && editingFileName.value.trim() !== file.name) {
      emit('trackNameChange', fileId, editingFileName.value.trim());
    }
  }
  editingFileId.value = null;
}

function cancelEditFileName() {
  editingFileId.value = null;
}

function handleRenderAll() {
  emit('renderAllMissing', missingVariants.value);
}

function handleAudioEnded() {
  playingFileId.value = null;
}

function handleUploadFiles(files: FileList | null) {
  if (!files || files.length === 0) return;
  emit('fileUpload', props.script.id, Array.from(files));
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  handleUploadFiles(e.dataTransfer?.files ?? null);
}

function handleInputChange(e: Event) {
  handleUploadFiles((e.target as HTMLInputElement).files);
  (e.target as HTMLInputElement).value = '';
}
</script>

<template>
  <div class="relative">
    <Card
      class="border-r border-t border-b border-l-4 bg-surface-0 dark:bg-surface-900 shadow-sm rounded-2xl overflow-hidden relative script-card-transition"
      :class="
        !isExpanded && missingVariants.length > 0
          ? 'border-amber-400 dark:border-amber-500'
          : 'border-surface-200 dark:border-surface-800'
      "
      :style="{ borderLeftColor: script.color }"
      :data-script-id="script.id"
    >
      <template #content>
        <!-- Hidden DOM marker for test targeting -->
        <span
          v-if="!isExpanded && missingVariants.length > 0"
          data-testid="missing-variants-indicator"
          class="hidden"
          aria-hidden="true"
        />
        <div class="flex flex-col gap-4">
          <!-- Script Header -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 font-semibold flex-1">
              <!-- Name + badges -->
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span
                  class="font-bold text-lg text-surface-900 dark:text-white truncate flex-1 min-w-0 select-none cursor-pointer"
                  @click="emit('toggleExpand')"
                  >{{ script.name }}</span
                >
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-all shrink-0"
                  :aria-label="
                    props.isExpanded
                      ? t('audioGroupCard.collapseAriaLabel')
                      : t('audioGroupCard.expandAriaLabel')
                  "
                  @click.stop="emit('toggleExpand')"
                >
                  <i
                    class="pi text-sm transition-transform duration-200"
                    :class="
                      props.isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'
                    "
                  />
                </button>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <ScriptColorDialog
                v-model:visible="colorDialogVisible"
                :script-id="script.id"
                :current-color="script.color"
                @color-change="(id, color) => emit('colorChange', id, color)"
              />
            </div>
          </div>

          <!-- Inline Action Buttons (visible when expanded) -->
          <div
            v-if="props.isExpanded"
            class="flex items-center border-b border-surface-100 dark:border-surface-700/50 pb-3"
          >
            <div class="flex items-center gap-0.5">
              <Button
                v-tooltip.bottom="t('audioGroupCard.menu.rename')"
                :label="t('audioGroupCard.menu.rename')"
                :pt="{ label: { class: 'hidden sm:inline' } }"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="renameDialogVisible = true"
              />
              <Button
                v-tooltip.bottom="t('audioGroupCard.menu.changeColor')"
                :label="t('audioGroupCard.menu.changeColor')"
                :pt="{ label: { class: 'hidden sm:inline' } }"
                icon="pi pi-palette"
                size="small"
                text
                severity="secondary"
                @click="colorDialogVisible = true"
              />
              <Button
                v-if="missingVariants.length > 0 && script.tracks.length > 0"
                v-tooltip.bottom="t('audioGroupCard.menu.renderAll')"
                :label="t('audioGroupCard.menu.renderAll')"
                :pt="{ label: { class: 'hidden sm:inline' } }"
                icon="pi pi-bolt"
                size="small"
                text
                severity="warning"
                @click="handleRenderAll()"
              />
            </div>
            <div class="ml-auto">
              <Button
                v-tooltip.bottom="t('audioGroupCard.menu.delete')"
                :label="t('audioGroupCard.menu.delete')"
                :pt="{ label: { class: 'hidden sm:inline' } }"
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                @click="emit('deleteScript', script.id)"
              />
            </div>
          </div>

          <!-- Tracks List -->
          <div
            v-if="script.tracks.length > 0"
            v-show="props.isExpanded"
            class="flex flex-col gap-2"
          >
            <div
              v-for="file in script.tracks"
              :key="file.id"
              class="bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-100 dark:border-surface-800 overflow-hidden"
            >
              <!-- File header -->
              <div
                class="flex items-center px-3 py-2 border-b border-surface-100 dark:border-surface-700/50"
              >
                <input
                  v-if="editingFileId === file.id"
                  ref="fileNameInputRef"
                  v-model="editingFileName"
                  type="text"
                  class="flex-1 font-semibold text-sm bg-surface-50 dark:bg-surface-800 border border-primary-400 rounded-lg px-2 py-0.5 text-surface-800 dark:text-surface-100 outline-none focus:ring-2 focus:ring-primary-400"
                  :placeholder="t('audioGroupCard.trackNamePlaceholder')"
                  @blur="commitFileName"
                  @keydown.enter.prevent="commitFileName"
                  @keydown.escape.prevent="cancelEditFileName"
                />
                <button
                  v-else
                  type="button"
                  class="group flex items-center gap-1.5 flex-1 min-w-0 font-semibold text-sm text-surface-800 dark:text-surface-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left"
                  @click="startEditingFileName(file.id, file.name)"
                >
                  <span class="truncate">{{ file.name }}</span>
                  <i
                    class="pi pi-pencil text-xs text-surface-400 dark:text-surface-500 group-hover:text-primary-400 transition-colors shrink-0"
                  />
                </button>
              </div>
              <!-- Speed rows -->
              <div
                v-for="(spd, spdIdx) in SPEEDS"
                :key="spd.value"
                class="flex items-center gap-2 px-3 py-2 transition-colors"
                :class="[
                  spdIdx < SPEEDS.length - 1
                    ? 'border-b border-surface-100 dark:border-surface-700/30'
                    : '',
                  RENDER_SPEEDS.includes(spd.value) &&
                  !hasVariant(file, spd.value)
                    ? 'bg-amber-50/60 dark:bg-amber-900/10'
                    : '',
                ]"
              >
                <!-- Speed label -->
                <div class="flex items-center gap-1 w-10 shrink-0">
                  <span
                    class="text-xs font-mono font-semibold"
                    :class="
                      spd.value === 1.0
                        ? 'text-primary-500 dark:text-primary-400'
                        : 'text-surface-500 dark:text-surface-400'
                    "
                    >{{ spd.label }}</span
                  >
                  <i
                    v-if="
                      RENDER_SPEEDS.includes(spd.value) &&
                      !hasVariant(file, spd.value)
                    "
                    class="pi pi-exclamation-triangle text-[10px] text-amber-500 animate-pulse"
                  />
                </div>

                <!-- Play button -->
                <button
                  type="button"
                  class="w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0"
                  :class="
                    hasVariant(file, spd.value)
                      ? 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      : 'text-surface-300 dark:text-surface-600 cursor-not-allowed'
                  "
                  :disabled="!hasVariant(file, spd.value)"
                  :aria-label="
                    playingFileId === file.id && playingSpeed === spd.value
                      ? t('audioGroupCard.stopAriaLabel')
                      : t('audioGroupCard.playAriaLabel', { speed: spd.label })
                  "
                  @click="togglePlay(file, spd.value)"
                >
                  <i
                    :class="
                      playingFileId === file.id && playingSpeed === spd.value
                        ? 'pi pi-pause'
                        : 'pi pi-play'
                    "
                    class="text-xs"
                  />
                </button>

                <!-- Status text -->
                <span v-if="hasVariant(file, spd.value)" class="flex-1 text-xs"
                  ><span class="text-green-500 dark:text-green-400">{{
                    t('audioGroupCard.statusReady')
                  }}</span
                  ><span
                    v-if="getVariantDuration(file, spd.value) != null"
                    class="ml-1 text-surface-400 dark:text-surface-500"
                    data-testid="variant-duration"
                    >·
                    {{
                      formatDuration(getVariantDuration(file, spd.value)!)
                    }}</span
                  ></span
                >
                <span
                  v-else
                  class="flex-1 text-xs text-amber-500 dark:text-amber-400 font-medium"
                  >{{ t('audioGroupCard.statusMissing') }}</span
                >

                <!-- 1.0x: delete entire track -->
                <Button
                  v-if="spd.value === 1.0"
                  v-tooltip.top="t('audioGroupCard.deleteTrackTooltip')"
                  icon="pi pi-trash"
                  size="small"
                  text
                  severity="danger"
                  @click="emit('deleteTrack', file.id)"
                />

                <!-- Other speeds: render if missing, delete variant if exists -->
                <template v-else-if="RENDER_SPEEDS.includes(spd.value)">
                  <Button
                    v-if="hasVariant(file, spd.value)"
                    v-tooltip.top="
                      t('audioGroupCard.deleteVariantTooltip', {
                        speed: spd.label,
                      })
                    "
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="secondary"
                    @click="
                      emit('deleteVariant', getVariantId(file, spd.value)!)
                    "
                  />
                  <Button
                    v-else
                    v-tooltip.top="
                      t('audioGroupCard.renderTooltip', { speed: spd.label })
                    "
                    size="small"
                    outlined
                    severity="warning"
                    icon="pi pi-refresh"
                    :disabled="isRendering"
                    @click="emit('renderVariant', file, spd.value)"
                  />
                </template>
              </div>
            </div>
          </div>

          <!-- Upload zone -->
          <div
            v-show="props.isExpanded"
            role="button"
            tabindex="0"
            class="flex flex-col items-center justify-center gap-1 py-5 rounded-xl border border-dashed cursor-pointer transition-colors select-none"
            :class="
              isDragOver
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 hover:bg-surface-50 dark:hover:bg-surface-800/30'
            "
            @click="fileInputRef?.click()"
            @keydown.enter.prevent="fileInputRef?.click()"
            @keydown.space.prevent="fileInputRef?.click()"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop.prevent="handleDrop"
          >
            <i
              class="pi pi-cloud-upload text-2xl transition-colors"
              :class="isDragOver ? 'text-primary-500' : 'text-surface-400'"
            />
            <i18n-t
              keypath="audioGroupCard.dropZoneInstruction"
              tag="p"
              class="text-sm font-medium text-surface-500"
            >
              <template #clickHere>
                <span class="text-primary-500">{{
                  t('audioGroupCard.dropZoneClickHere')
                }}</span>
              </template>
            </i18n-t>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.wma,.opus,.webm,.caf"
            multiple
            @change="handleInputChange"
          />

          <!-- Hidden audio element for mini player -->
          <audio ref="audioEl" class="hidden" @ended="handleAudioEnded" />
        </div>
      </template>
    </Card>
    <span
      v-if="script.tracks.length > 0"
      data-testid="variant-count-badge"
      class="absolute -top-2 -right-2 min-w-4.5 h-4.5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none pointer-events-none"
      >{{ script.tracks.length }}</span
    >
  </div>

  <ScriptForm
    v-model:visible="renameDialogVisible"
    mode="rename"
    :script-id="script.id"
    :initial-name="script.name"
  />
</template>
