<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useScriptsStore } from '../../../stores/scripts';
import { useToast } from 'primevue/usetoast';

import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import FloatLabel from 'primevue/floatlabel';

const props = defineProps<{
  visible: boolean;
  mode?: 'create' | 'rename';
  scriptId?: string;
  initialName?: string;
}>();
const emit = defineEmits<{
  'update:visible': [value: boolean];
  scriptCreated: [id: string];
}>();

const store = useScriptsStore();
const toast = useToast();
const { t } = useI18n();

const newScriptName = ref('');
const isSubmitting = ref(false);

const dialogTitle = computed(() =>
  props.mode === 'rename'
    ? t('soundboardForm.renameDialogTitle')
    : t('soundboardForm.dialogTitle'),
);

const submitLabel = computed(() =>
  props.mode === 'rename'
    ? t('soundboardForm.renameSubmitButton')
    : t('soundboardForm.submitButton'),
);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      newScriptName.value =
        props.mode === 'rename' ? (props.initialName ?? '') : '';
    }
  },
  { immediate: true },
);

function onHide() {
  newScriptName.value = '';
}

async function submitForm() {
  if (!newScriptName.value.trim()) return;
  if (newScriptName.value.trim().length > 24) return;
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  if (props.mode === 'rename') {
    try {
      await store.updateScript(props.scriptId!, {
        name: newScriptName.value.trim(),
      });
      toast.add({
        severity: 'success',
        summary: t('soundboardForm.toast.renameSuccess'),
        life: 2000,
      });
      emit('update:visible', false);
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: t('soundboardForm.toast.renameError'),
        detail: (e as Error).message,
        life: 3000,
      });
    } finally {
      isSubmitting.value = false;
    }
  } else {
    try {
      const created = await store.createScript(newScriptName.value, '#8b5cf6');
      toast.add({
        severity: 'success',
        summary: t('soundboardForm.toast.createSuccess'),
        life: 2000,
      });
      emit('scriptCreated', created.id);
      emit('update:visible', false);
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: t('soundboardForm.toast.createError'),
        detail: (e as Error).message,
        life: 3000,
      });
    } finally {
      isSubmitting.value = false;
    }
  }
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    :modal="true"
    :draggable="false"
    :header="dialogTitle"
    class="w-[90vw] md:w-100"
    @update:visible="emit('update:visible', $event)"
    @hide="onHide"
  >
    <div class="flex flex-col gap-5">
      <FloatLabel>
        <InputText
          id="script-name"
          v-model="newScriptName"
          class="w-full"
          autocomplete="off"
          :maxlength="24"
          :disabled="isSubmitting"
          @keyup.enter="submitForm"
        />
        <label for="script-name">{{ t('soundboardForm.nameLabel') }}</label>
      </FloatLabel>
      <div class="flex justify-between text-xs text-surface-400">
        <span v-if="newScriptName.trim().length > 24" class="text-red-500">{{
          t('soundboardForm.nameTooLong')
        }}</span>
        <span v-else />
        <span>{{ newScriptName.length }}/24</span>
      </div>

      <Button
        :label="submitLabel"
        icon="pi pi-check"
        :loading="isSubmitting"
        :disabled="
          !newScriptName.trim() ||
          newScriptName.trim().length > 24 ||
          isSubmitting
        "
        class="w-full font-bold rounded-xl"
        @click="submitForm"
      />
    </div>
  </Dialog>
</template>
