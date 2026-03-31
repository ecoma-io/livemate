import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import ScriptTileGrid from './ScriptTileGrid.vue';

describe('ScriptTileGrid', () => {
  const mockScripts = [
    { id: 's1', name: 'Script 1', color: '#ef4444', sortOrder: 0, tracks: [] },
    { id: 's2', name: 'Script 2', color: '#3b82f6', sortOrder: 1, tracks: [] },
  ];

  function mountGrid(props = {}) {
    return mount(ScriptTileGrid, {
      props: {
        scripts: mockScripts,
        activeScriptId: null,
        currentSpeed: 1.0,
        isPlaying: false,
        ...props,
      },
      global: {
        plugins: [createPinia(), PrimeVue, i18n],
      },
    });
  }

  it('renders script tiles when scripts exist', () => {
    const wrapper = mountGrid();
    expect(wrapper.text()).toContain('Script 1');
    expect(wrapper.text()).toContain('Script 2');
  });

  it('renders empty state when no scripts', () => {
    const wrapper = mountGrid({ scripts: [] });
    expect(wrapper.text()).toContain('No audio available');
  });

  it('emits play event when a tile emits play', async () => {
    const wrapper = mountGrid();
    const tiles = wrapper.findAllComponents({ name: 'ScriptTile' });
    await tiles[0].vm.$emit('play', 's1');
    expect(wrapper.emitted('play')?.[0]).toEqual(['s1']);
  });

  it('shows current speed in empty state', () => {
    const wrapper = mountGrid({ scripts: [], currentSpeed: 1.3 });
    expect(wrapper.text()).toContain('1.3');
  });

  it('passes isAnyPlaying=true to all tiles when playing', () => {
    const wrapper = mountGrid({ isPlaying: true });
    const tiles = wrapper.findAllComponents({ name: 'ScriptTile' });
    expect(tiles.every((t) => t.props('isAnyPlaying') === true)).toBe(true);
  });

  it('marks the active tile correctly', () => {
    const wrapper = mountGrid({ activeScriptId: 's1' });
    const tiles = wrapper.findAllComponents({ name: 'ScriptTile' });
    expect(tiles[0].props('isActive')).toBe(true);
    expect(tiles[1].props('isActive')).toBe(false);
  });
});
