import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import UploadProgressDialog from './UploadProgressDialog.vue';

vi.mock('primevue/dialog', () => ({
  default: {
    name: 'Dialog',
    props: ['visible', 'closable', 'modal', 'draggable', 'header'],
    emits: ['update:visible'],
    template: '<div v-if="visible"><slot /><slot name="footer" /></div>',
  },
}));

vi.mock('primevue/progressbar', () => ({
  default: {
    name: 'ProgressBar',
    props: ['value', 'mode'],
    template:
      '<div class="p-progressbar progressbar" :data-mode="mode">{{ value }}%</div>',
  },
}));

describe('UploadProgressDialog', () => {
  function mountDialog(props = {}) {
    return mount(UploadProgressDialog, {
      props: {
        visible: true,
        phase: 'uploading' as const,
        currentFileName: 'audio.mp3',
        currentIndex: 1,
        total: 3,
        successCount: 0,
        failedCount: 0,
        ...props,
      },
      global: {
        plugins: [createPinia(), PrimeVue, i18n],
      },
    });
  }

  // ─── Uploading phase ──────────────────────────────────────────────

  it('shows spinner icon when uploading', () => {
    const wrapper = mountDialog({ phase: 'uploading' });
    expect(wrapper.find('.pi-upload').exists()).toBe(true);
  });

  it('does not show close button while uploading', () => {
    const wrapper = mountDialog({ phase: 'uploading' });
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(false);
  });

  it('shows current file name while uploading', () => {
    const wrapper = mountDialog({
      phase: 'uploading',
      currentFileName: 'my-track.mp3',
    });
    expect(wrapper.text()).toContain('my-track.mp3');
  });

  it('shows progress count while uploading', () => {
    const wrapper = mountDialog({
      phase: 'uploading',
      currentIndex: 2,
      total: 5,
    });
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('5');
  });

  it('shows two progress bars while uploading (overall + indeterminate)', () => {
    const wrapper = mountDialog({ phase: 'uploading' });
    expect(wrapper.findAll('.p-progressbar')).toHaveLength(2);
  });

  it('shows indeterminate progress bar for current file', () => {
    const wrapper = mountDialog({ phase: 'uploading' });
    const bars = wrapper.findAll('.p-progressbar');
    const indeterminate = bars.find(
      (b) => b.attributes('data-mode') === 'indeterminate',
    );
    expect(indeterminate).toBeTruthy();
  });

  // ─── Done phase (no errors) ────────────────────────────────────────

  it('shows check icon when done without errors', () => {
    const wrapper = mountDialog({
      phase: 'done',
      successCount: 3,
      failedCount: 0,
      currentIndex: 3,
      total: 3,
    });
    expect(wrapper.find('.pi-check-circle').exists()).toBe(true);
  });

  it('shows close button when done', () => {
    const wrapper = mountDialog({
      phase: 'done',
      successCount: 1,
      failedCount: 0,
    });
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
    expect(wrapper.text()).toContain('Close');
  });

  it('shows success message when done without errors', () => {
    const wrapper = mountDialog({
      phase: 'done',
      successCount: 2,
      failedCount: 0,
      currentIndex: 2,
      total: 2,
    });
    expect(wrapper.text()).toContain('Upload complete!');
  });

  it('hides current file name section when done', () => {
    const wrapper = mountDialog({
      phase: 'done',
      successCount: 1,
      failedCount: 0,
    });
    // Indeterminate bar only shown during uploading
    const bars = wrapper.findAll('.p-progressbar');
    const indeterminate = bars.find(
      (b) => b.attributes('data-mode') === 'indeterminate',
    );
    expect(indeterminate).toBeFalsy();
  });

  // ─── Done phase (with errors) ─────────────────────────────────────

  it('shows warning icon when done with errors', () => {
    const wrapper = mountDialog({
      phase: 'done',
      successCount: 2,
      failedCount: 1,
      currentIndex: 3,
      total: 3,
    });
    expect(wrapper.find('.pi-exclamation-circle').exists()).toBe(true);
  });

  it('shows error summary message when done with errors', () => {
    const wrapper = mountDialog({
      phase: 'done',
      successCount: 2,
      failedCount: 1,
      currentIndex: 3,
      total: 3,
    });
    expect(wrapper.text()).toContain('2 uploaded');
    expect(wrapper.text()).toContain('1 failed');
  });

  // ─── Error phase ──────────────────────────────────────────────────

  it('shows warning icon when phase is error', () => {
    const wrapper = mountDialog({ phase: 'error', failedCount: 1 });
    expect(wrapper.find('.pi-exclamation-circle').exists()).toBe(true);
  });

  it('shows close button when phase is error', () => {
    const wrapper = mountDialog({ phase: 'error', failedCount: 1 });
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  // ─── Visibility ───────────────────────────────────────────────────

  it('does not render when visible is false', () => {
    const wrapper = mountDialog({ visible: false });
    expect(wrapper.find('.pi-upload').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(false);
  });

  // ─── Emit ─────────────────────────────────────────────────────────

  it('emits update:visible=false when close button is clicked', async () => {
    const wrapper = mountDialog({
      phase: 'done',
      successCount: 1,
      failedCount: 0,
    });
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });
});
