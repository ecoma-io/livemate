import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import ScriptTile from './ScriptTile.vue';

describe('ScriptTile', () => {
  const mockScript = {
    id: 's1',
    name: 'Test Script',
    color: '#ef4444',
    sortOrder: 0,
    tracks: [],
  };

  function mountTile(props = {}) {
    return mount(ScriptTile, {
      props: { script: mockScript, isActive: false, isAnyPlaying: false, ...props },
      global: {
        plugins: [createPinia(), PrimeVue, i18n],
      },
    });
  }

  it('renders script name', () => {
    const wrapper = mountTile();
    expect(wrapper.text()).toContain('Test Script');
  });

  it('applies script color as background', () => {
    const wrapper = mountTile();
    const button = wrapper.find('button');
    expect(button.attributes('style')).toContain('background-color: rgb(239, 68, 68)');
  });

  it('emits play event with script id on click', async () => {
    const wrapper = mountTile();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('play')?.[0]).toEqual(['s1']);
  });

  it('shows active styling when isActive is true', () => {
    const wrapper = mountTile({ isActive: true });
    const button = wrapper.find('button');
    expect(button.classes()).toContain('ring-4');
  });

  it('shows wave animation when active', () => {
    const wrapper = mountTile({ isActive: true });
    expect(wrapper.findAll('.auto-height-bounce').length).toBe(5);
  });

  it('does not show wave animation when not active', () => {
    const wrapper = mountTile({ isActive: false });
    expect(wrapper.findAll('.auto-height-bounce').length).toBe(0);
  });

  it('applies disabled styling when isAnyPlaying and not active', () => {
    const wrapper = mountTile({ isAnyPlaying: true, isActive: false });
    const button = wrapper.find('button');
    expect(button.classes()).toContain('opacity-30');
    expect(button.classes()).toContain('pointer-events-none');
  });

  it('does not apply disabled styling to the active tile when isAnyPlaying', () => {
    const wrapper = mountTile({ isAnyPlaying: true, isActive: true });
    const button = wrapper.find('button');
    expect(button.classes()).not.toContain('opacity-30');
    expect(button.classes()).toContain('ring-4');
  });
});
