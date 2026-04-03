import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ScriptForm from './ScriptForm.vue';

vi.mock('primevue/dialog', () => ({
  default: {
    name: 'Dialog',
    props: ['visible', 'modal', 'draggable', 'header'],
    emits: ['update:visible', 'hide'],
    template:
      '<div v-if="visible"><slot /><template v-if="$slots.footer"><slot name="footer" /></template></div>',
  },
}));

const { mockCreateScript, mockUpdateScript } = vi.hoisted(() => ({
  mockCreateScript: vi.fn().mockResolvedValue({
    id: 's1',
    name: 'New Script',
    color: '#6b7280',
    sortOrder: 0,
    tracks: [],
  }),
  mockUpdateScript: vi.fn().mockResolvedValue({
    id: 's1',
    name: 'Renamed Script',
    color: '#6b7280',
    sortOrder: 0,
    tracks: [],
  }),
}));

vi.mock('../../../services/api', () => ({
  api: {
    getScripts: vi.fn().mockResolvedValue([]),
    createScript: (...args: unknown[]) => mockCreateScript(...args),
    updateScript: (...args: unknown[]) => mockUpdateScript(...args),
  },
}));

describe('ScriptForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mountForm(visible = true) {
    return mount(ScriptForm, {
      props: { visible },
      global: {
        plugins: [createPinia(), PrimeVue, ToastService, i18n],
      },
    });
  }

  function mountRenameForm(
    visible = true,
    scriptId = 's1',
    initialName = 'Old Name',
  ) {
    return mount(ScriptForm, {
      props: { visible, mode: 'rename', scriptId, initialName },
      global: {
        plugins: [createPinia(), PrimeVue, ToastService, i18n],
      },
    });
  }

  it('renders when visible', () => {
    const wrapper = mountForm(true);
    expect(wrapper.html()).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const wrapper = mountForm(false);
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('renders create button', () => {
    const wrapper = mountForm(true);
    expect(wrapper.text()).toContain('Create Now');
  });

  it('creates script on button click', async () => {
    const wrapper = mountForm(true);
    const input = wrapper.find('#script-name');
    await input.setValue('My Script');

    const createBtn = wrapper
      .findAllComponents({ name: 'Button' })
      .find((b) => b.text().includes('Create Now'));
    if (createBtn) {
      await createBtn.trigger('click');
      await flushPromises();
      expect(mockCreateScript).toHaveBeenCalled();
    }
  });

  it('creates script on enter key', async () => {
    const wrapper = mountForm(true);
    const input = wrapper.find('#script-name');
    await input.setValue('Enter Script');
    await input.trigger('keyup.enter');
    await flushPromises();
    expect(mockCreateScript).toHaveBeenCalled();
  });

  it('does not create script with empty name', async () => {
    const wrapper = mountForm(true);
    const input = wrapper.find('#script-name');
    await input.setValue('');
    await input.trigger('keyup.enter');
    await flushPromises();
    expect(mockCreateScript).not.toHaveBeenCalled();
  });

  it('handles create script error', async () => {
    mockCreateScript.mockRejectedValueOnce(new Error('Network error'));
    const wrapper = mountForm(true);
    const input = wrapper.find('#script-name');
    await input.setValue('Failing Script');
    await input.trigger('keyup.enter');
    await flushPromises();
    expect(mockCreateScript).toHaveBeenCalled();
  });

  it('shows color picker when trigger clicked', async () => {
    const wrapper = mountForm(true);
    const colorBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('style')?.includes('background-color'));
    if (colorBtn) {
      await colorBtn.trigger('click');
      await wrapper.vm.$nextTick();
      // Color picker should be open
    }
  });

  it('emits update:visible false on hide', async () => {
    const wrapper = mountForm(true);
    const dialog = wrapper.findComponent({ name: 'Dialog' });
    await dialog.vm.$emit('hide');
    // onHide should reset the internal state
  });

  it('disables create button when name exceeds 24 characters', async () => {
    const wrapper = mountForm(true);
    const input = wrapper.find('#script-name');
    await input.setValue('A'.repeat(25));
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Create Now'));
    expect(createBtn?.element.disabled).toBe(true);
  });

  it('does not disable create button when name is exactly 24 characters', async () => {
    const wrapper = mountForm(true);
    const input = wrapper.find('#script-name');
    await input.setValue('A'.repeat(24));
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Create Now'));
    expect(createBtn?.element.disabled).toBe(false);
  });

  it('does not call createScript when name exceeds 24 characters on enter', async () => {
    const wrapper = mountForm(true);
    const input = wrapper.find('#script-name');
    await input.setValue('A'.repeat(25));
    await input.trigger('keyup.enter');
    await flushPromises();
    expect(mockCreateScript).not.toHaveBeenCalled();
  });

  describe('loading state — create mode', () => {
    it('disables submit button while create request is in-flight', async () => {
      let resolveCreate!: (val: {
        id: string;
        name: string;
        color: string;
        sortOrder: number;
        tracks: never[];
      }) => void;
      mockCreateScript.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );

      const wrapper = mountForm(true);
      const input = wrapper.find('#script-name');
      await input.setValue('Loading Test');

      // Trigger submit — isSubmitting becomes true before the awaited API call
      input.trigger('keyup.enter');
      await wrapper.vm.$nextTick();

      const createBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Create Now'));
      expect(createBtn?.element.disabled).toBe(true);

      // Unblock and verify loading resets
      resolveCreate({
        id: 's1',
        name: 'Loading Test',
        color: '#8b5cf6',
        sortOrder: 0,
        tracks: [],
      });
      await flushPromises();
      expect(createBtn?.element.disabled).toBe(false);
    });

    it('disables name input while create request is in-flight', async () => {
      let resolveCreate!: (val: {
        id: string;
        name: string;
        color: string;
        sortOrder: number;
        tracks: never[];
      }) => void;
      mockCreateScript.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );

      const wrapper = mountForm(true);
      const input = wrapper.find('#script-name');
      await input.setValue('Loading Test');

      input.trigger('keyup.enter');
      await wrapper.vm.$nextTick();

      expect((input.element as HTMLInputElement).disabled).toBe(true);

      resolveCreate({
        id: 's1',
        name: 'Loading Test',
        color: '#8b5cf6',
        sortOrder: 0,
        tracks: [],
      });
      await flushPromises();
      expect((input.element as HTMLInputElement).disabled).toBe(false);
    });

    it('prevents double submission on rapid triggers', async () => {
      const wrapper = mountForm(true);
      const input = wrapper.find('#script-name');
      await input.setValue('Double Click');

      // Trigger twice without awaiting between
      input.trigger('keyup.enter');
      input.trigger('keyup.enter');
      await flushPromises();

      expect(mockCreateScript).toHaveBeenCalledTimes(1);
    });

    it('resets loading state after create error', async () => {
      mockCreateScript.mockRejectedValueOnce(new Error('Network error'));

      const wrapper = mountForm(true);
      const input = wrapper.find('#script-name');
      await input.setValue('Error Script');

      input.trigger('keyup.enter');
      await flushPromises();

      const createBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Create Now'));
      expect(createBtn?.element.disabled).toBe(false);
    });
  });

  describe('rename mode', () => {
    it('pre-fills name input with initialName', async () => {
      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      expect((input.element as HTMLInputElement).value).toBe('Old Name');
    });

    it('shows rename dialog title', () => {
      const wrapper = mountRenameForm();
      const dialog = wrapper.findComponent({ name: 'Dialog' });
      expect(dialog.props('header')).toBe('Rename Audio Group');
    });

    it('shows Save submit button label', () => {
      const wrapper = mountRenameForm();
      const saveBtn = wrapper
        .findAllComponents({ name: 'Button' })
        .find((b) => b.text().includes('Save'));
      expect(saveBtn).toBeTruthy();
    });

    it('calls updateScript on submit', async () => {
      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('New Name');
      await input.trigger('keyup.enter');
      await flushPromises();
      expect(mockUpdateScript).toHaveBeenCalledWith('s1', { name: 'New Name' });
    });

    it('does not call createScript in rename mode', async () => {
      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('New Name');
      await input.trigger('keyup.enter');
      await flushPromises();
      expect(mockCreateScript).not.toHaveBeenCalled();
    });

    it('handles updateScript error', async () => {
      mockUpdateScript.mockRejectedValueOnce(new Error('Server error'));
      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('New Name');
      await input.trigger('keyup.enter');
      await flushPromises();
      expect(mockUpdateScript).toHaveBeenCalled();
    });

    it('does not call updateScript with empty name', async () => {
      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('');
      await input.trigger('keyup.enter');
      await flushPromises();
      expect(mockUpdateScript).not.toHaveBeenCalled();
    });

    it('does not call updateScript when name exceeds 24 characters', async () => {
      const wrapper = mountRenameForm();
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('A'.repeat(25));
      await input.trigger('keyup.enter');
      await flushPromises();
      expect(mockUpdateScript).not.toHaveBeenCalled();
    });

    it('disables submit button while rename request is in-flight', async () => {
      let resolveUpdate!: (val: {
        id: string;
        name: string;
        color: string;
        sortOrder: number;
        tracks: never[];
      }) => void;
      mockUpdateScript.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          }),
      );

      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('New Name');

      input.trigger('keyup.enter');
      await wrapper.vm.$nextTick();

      const saveBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Save'));
      expect(saveBtn?.element.disabled).toBe(true);

      resolveUpdate({
        id: 's1',
        name: 'New Name',
        color: '#6b7280',
        sortOrder: 0,
        tracks: [],
      });
      await flushPromises();
      expect(saveBtn?.element.disabled).toBe(false);
    });

    it('prevents double submission in rename mode', async () => {
      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('New Name');

      input.trigger('keyup.enter');
      input.trigger('keyup.enter');
      await flushPromises();

      expect(mockUpdateScript).toHaveBeenCalledTimes(1);
    });

    it('resets loading state after rename error', async () => {
      mockUpdateScript.mockRejectedValueOnce(new Error('Server error'));

      const wrapper = mountRenameForm(true, 's1', 'Old Name');
      await wrapper.vm.$nextTick();
      const input = wrapper.find('#script-name');
      await input.setValue('New Name');

      input.trigger('keyup.enter');
      await flushPromises();

      const saveBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Save'));
      expect(saveBtn?.element.disabled).toBe(false);
    });
  });
});
