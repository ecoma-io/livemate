import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import PlayerTopBar from './PlayerTopBar.vue';
import { SPEEDS } from '../../../config/speeds';
import { useLayoutStore } from '../../../stores/layout';

describe('PlayerTopBar', () => {
  function mountTopBar(props = {}) {
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(PlayerTopBar, {
      props: {
        isActive: true,
        isPlaying: false,
        speeds: SPEEDS,
        currentSpeed: 1.0,
        volume: 1.0,
        ...props,
      },
      global: {
        plugins: [pinia, PrimeVue, i18n],
        stubs: { Teleport: true },
      },
    });
  }

  it('renders speed and volume sliders when active', () => {
    const wrapper = mountTopBar({ isActive: true, isPlaying: false });
    const sliders = wrapper.findAllComponents({ name: 'Slider' });
    expect(sliders.length).toBe(2);
  });

  it('renders no controls when not active', () => {
    const wrapper = mountTopBar({ isActive: false });
    const sliders = wrapper.findAllComponents({ name: 'Slider' });
    expect(sliders.length).toBe(0);
  });

  it('renders controls when active and playing', () => {
    const wrapper = mountTopBar({ isActive: true, isPlaying: true });
    const sliders = wrapper.findAllComponents({ name: 'Slider' });
    expect(sliders.length).toBe(2);
  });

  it('renders stop button only when playing', () => {
    const playingWrapper = mountTopBar({ isActive: true, isPlaying: true });
    expect(playingWrapper.find('button').exists()).toBe(true);

    const idleWrapper = mountTopBar({ isActive: true, isPlaying: false });
    expect(idleWrapper.find('button').exists()).toBe(false);
  });

  it('emits speedChange with correct value when speed slider updates', async () => {
    const wrapper = mountTopBar({ isActive: true, isPlaying: true });
    const speedSlider = wrapper.findAllComponents({ name: 'Slider' })[0];
    await speedSlider.vm.$emit('update:modelValue', 12); // 1.2 × 10
    expect(wrapper.emitted('speedChange')).toBeTruthy();
    expect(wrapper.emitted('speedChange')![0]).toEqual([1.2]);
  });

  it('emits volumeChange with correct value when volume slider updates', async () => {
    const wrapper = mountTopBar({ isActive: true, isPlaying: true });
    const volumeSlider = wrapper.findAllComponents({ name: 'Slider' })[1];
    await volumeSlider.vm.$emit('update:modelValue', 80);
    expect(wrapper.emitted('volumeChange')).toBeTruthy();
    expect(wrapper.emitted('volumeChange')![0]).toEqual([0.8]);
  });

  it('emits stop when stop button is clicked', async () => {
    const wrapper = mountTopBar({ isActive: true, isPlaying: true });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('stop')).toBeTruthy();
  });

  it('sets layout.subHeaderVisible to true when active', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const layout = useLayoutStore(pinia);
    mount(PlayerTopBar, {
      props: { isActive: true, isPlaying: false, speeds: SPEEDS, currentSpeed: 1.0, volume: 0.8 },
      global: { plugins: [pinia, PrimeVue, i18n], stubs: { Teleport: true } },
    });
    expect(layout.subHeaderVisible).toBe(true);
  });

  it('sets layout.subHeaderVisible to false when not active', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const layout = useLayoutStore(pinia);
    mount(PlayerTopBar, {
      props: { isActive: false, isPlaying: false, speeds: SPEEDS, currentSpeed: 1.0, volume: 0.8 },
      global: { plugins: [pinia, PrimeVue, i18n], stubs: { Teleport: true } },
    });
    expect(layout.subHeaderVisible).toBe(false);
  });

  it('resets layout.subHeaderVisible to false on unmount', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const layout = useLayoutStore(pinia);
    const wrapper = mount(PlayerTopBar, {
      props: { isActive: true, isPlaying: false, speeds: SPEEDS, currentSpeed: 1.0, volume: 0.8 },
      global: { plugins: [pinia, PrimeVue, i18n], stubs: { Teleport: true } },
    });
    expect(layout.subHeaderVisible).toBe(true);
    await wrapper.unmount();
    expect(layout.subHeaderVisible).toBe(false);
  });

  it('renders both speed badge and volume badge when active', () => {
    const wrapper = mountTopBar({ isActive: true, volume: 0.75 });
    const badges = wrapper.findAll('.tabular-nums');
    expect(badges.length).toBe(2);
    expect(badges[0].text()).toBe('1.0x');
    expect(badges[1].text()).toBe('75%');
  });
});

