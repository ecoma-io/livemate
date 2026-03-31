import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import RenderProgressDialog from './RenderProgressDialog.vue';

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
    props: ['value'],
    template: '<div class="p-progressbar progressbar">{{ value }}%</div>',
  },
}));

describe('RenderProgressDialog', () => {
  function mountDialog(props = {}) {
    return mount(RenderProgressDialog, {
      props: {
        visible: true,
        phase: 'rendering' as const,
        progress: 50,
        fileName: 'test.mp3',
        speed: 1.2,
        phaseLabel: 'Processing...',
        errorMessage: '',
        isRendering: true,
        sessionTotal: 1,
        sessionCompleted: 0,
        sessionErrorCount: 0,
        ...props,
      },
      global: {
        plugins: [createPinia(), PrimeVue, i18n],
      },
    });
  }

  // ─── Single mode ───────────────────────────────────────────────

  it('single mode: renders file name and speed in title', () => {
    const wrapper = mountDialog({ sessionTotal: 1 });
    expect(wrapper.text()).toContain('test.mp3');
    expect(wrapper.text()).toContain('1.2x');
  });

  it('single mode: shows exactly one progress bar', () => {
    const wrapper = mountDialog({ sessionTotal: 1 });
    expect(wrapper.findAll('.p-progressbar')).toHaveLength(1);
  });

  it('renders phase label', () => {
    const wrapper = mountDialog({ phaseLabel: 'Uploading...' });
    expect(wrapper.text()).toContain('Uploading...');
  });

  it('shows check icon when done', () => {
    const wrapper = mountDialog({ phase: 'done' });
    expect(wrapper.find('.pi-check-circle').exists()).toBe(true);
  });

  it('shows error icon when error', () => {
    const wrapper = mountDialog({ phase: 'error' });
    expect(wrapper.find('.pi-times-circle').exists()).toBe(true);
  });

  it('shows spinner icon during processing', () => {
    const wrapper = mountDialog({ phase: 'rendering' });
    expect(wrapper.find('.pi-cog').exists()).toBe(true);
  });

  it('shows error message when provided', () => {
    const wrapper = mountDialog({
      phase: 'error',
      errorMessage: 'Something went wrong',
    });
    expect(wrapper.text()).toContain('Something went wrong');
  });

  it('single mode: no footer button when done (auto-close handles it)', () => {
    const wrapper = mountDialog({ phase: 'done', isRendering: false, sessionTotal: 1 });
    expect(wrapper.text()).not.toContain('Done');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(false);
  });

  it('single mode: renders close button when error', () => {
    const wrapper = mountDialog({ phase: 'error', isRendering: false, sessionTotal: 1 });
    expect(wrapper.text()).toContain('Close');
  });

  it('does not render when not visible', () => {
    const wrapper = mountDialog({ visible: false });
    expect(wrapper.find('.pi-cog').exists()).toBe(false);
  });

  it('single mode: emits update:visible false when close button clicked on error', async () => {
    const wrapper = mountDialog({ phase: 'error', isRendering: false, sessionTotal: 1 });
    const btn = wrapper.findComponent({ name: 'Button' });
    expect(btn.exists()).toBe(true);
    await btn.trigger('click');
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });

  // ─── Batch mode ────────────────────────────────────────────────

  it('batch mode: shows two progress bars', () => {
    const wrapper = mountDialog({
      sessionTotal: 10,
      sessionCompleted: 3,
      sessionErrorCount: 0,
    });
    expect(wrapper.findAll('.p-progressbar')).toHaveLength(2);
  });

  it('batch mode: shows files progress label', () => {
    const wrapper = mountDialog({
      sessionTotal: 10,
      sessionCompleted: 3,
      sessionErrorCount: 0,
    });
    expect(wrapper.text()).toContain('3 / 10 tracks');
  });

  it('batch mode: shows current file label', () => {
    const wrapper = mountDialog({
      sessionTotal: 5,
      sessionCompleted: 1,
      sessionErrorCount: 0,
      fileName: 'batch.mp3',
      speed: 1.3,
    });
    expect(wrapper.text()).toContain('batch.mp3');
    expect(wrapper.text()).toContain('1.3x');
  });

  it('batch mode: shows error count badge when errors present', () => {
    const wrapper = mountDialog({
      sessionTotal: 5,
      sessionCompleted: 2,
      sessionErrorCount: 2,
    });
    expect(wrapper.text()).toContain('2 error(s)');
  });

  it('batch mode: no error badge when no errors', () => {
    const wrapper = mountDialog({
      sessionTotal: 5,
      sessionCompleted: 3,
      sessionErrorCount: 0,
    });
    expect(wrapper.text()).not.toContain('error(s)');
  });

  it('batch mode: no footer close button even when done', () => {
    const wrapper = mountDialog({
      phase: 'done',
      isRendering: false,
      sessionTotal: 5,
      sessionCompleted: 5,
      sessionErrorCount: 0,
    });
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(false);
  });
});

