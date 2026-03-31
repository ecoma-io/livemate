import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import i18n from '../../../locales';
import ScriptColorDialog from './ScriptColorDialog.vue';

function mountDialog(props = {}) {
  return mount(ScriptColorDialog, {
    props: {
      visible: true,
      scriptId: 's1',
      currentColor: '#3b82f6',
      ...props,
    },
    global: {
      plugins: [PrimeVue, i18n],
      stubs: {
        Dialog: {
          name: 'Dialog',
          props: ['visible', 'modal', 'draggable', 'header'],
          template: '<div v-if="visible"><slot /></div>',
        },
      },
    },
  });
}

describe('ScriptColorDialog', () => {
  it('renders 24 color buttons when visible', () => {
    const wrapper = mountDialog();
    const buttons = wrapper.findAll('.grid button');
    expect(buttons.length).toBe(24);
  });

  it('applies selected ring class to current color button', () => {
    const wrapper = mountDialog({ currentColor: '#3b82f6' });
    const buttons = wrapper.findAll('.grid button');
    // #3b82f6 is index 10 in PALETTE
    expect(buttons[10].classes()).toContain('scale-110');
    expect(buttons[10].classes()).not.toContain('border-transparent');
  });

  it('applies unselected class to non-current color buttons', () => {
    const wrapper = mountDialog({ currentColor: '#3b82f6' });
    const buttons = wrapper.findAll('.grid button');
    expect(buttons[0].classes()).toContain('border-transparent');
  });

  it('emits colorChange with correct scriptId and color on click', async () => {
    const wrapper = mountDialog({ scriptId: 's42', currentColor: '#ef4444' });
    const buttons = wrapper.findAll('.grid button');
    await buttons[2].trigger('click'); // #f59e0b
    expect(wrapper.emitted('colorChange')).toBeTruthy();
    expect(wrapper.emitted('colorChange')![0]).toEqual(['s42', '#f59e0b']);
  });

  it('emits update:visible false after selecting a color', async () => {
    const wrapper = mountDialog();
    const buttons = wrapper.findAll('.grid button');
    await buttons[0].trigger('click');
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });

  it('does not render color buttons when visible is false', () => {
    const wrapper = mountDialog({ visible: false });
    const buttons = wrapper.findAll('.grid button');
    expect(buttons.length).toBe(0);
  });
});
