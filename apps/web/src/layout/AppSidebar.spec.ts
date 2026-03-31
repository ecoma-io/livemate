import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../locales';
import PrimeVue from 'primevue/config';
import AppSidebar from './AppSidebar.vue';

describe('AppSidebar', () => {
  function mountSidebar(props = {}) {
    return mount(AppSidebar, {
      props: { open: false, currentRouteName: 'dashboard', ...props },
      global: {
        plugins: [createPinia(), PrimeVue, i18n],
      },
    });
  }

  it('renders branding', () => {
    const wrapper = mountSidebar();
    expect(wrapper.text()).toContain('Live Mate');
  });

  it('renders navigation items', () => {
    const wrapper = mountSidebar();
    expect(wrapper.text()).toContain('Live Studio');
    expect(wrapper.text()).toContain('Soundboard');
    expect(wrapper.text()).toContain('Account');
  });

  it('emits navigate when nav button is clicked', async () => {
    const wrapper = mountSidebar();
    const buttons = wrapper.findAll('nav button');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['scripts']);
  });

  it('emits navigate when branding is clicked', async () => {
    const wrapper = mountSidebar();
    // Click on the branding div
    const brandingDiv = wrapper.find('.cursor-pointer');
    await brandingDiv.trigger('click');
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['dashboard']);
  });

  it('emits close when close button is clicked', async () => {
    const wrapper = mountSidebar({ open: true });
    // Find the close button (with pi-times icon)
    const closeButton = wrapper
      .findAll('button')
      .find((b) => b.find('.pi-times').exists());
    if (closeButton) {
      await closeButton.trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    }
  });

  it('highlights active route', () => {
    const wrapper = mountSidebar({ currentRouteName: 'dashboard' });
    const buttons = wrapper.findAll('nav button');
    expect(buttons[0].classes()).toContain('bg-primary-500');
  });

  it('applies open class when open prop is true', () => {
    const wrapper = mountSidebar({ open: true });
    const aside = wrapper.find('aside');
    expect(aside.classes()).toContain('translate-x-0');
  });

  it('applies hidden class when open prop is false', () => {
    const wrapper = mountSidebar({ open: false });
    const aside = wrapper.find('aside');
    expect(aside.classes()).toContain('-translate-x-full');
  });
});
