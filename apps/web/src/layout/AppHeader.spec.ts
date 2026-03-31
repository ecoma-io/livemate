import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import i18n from '../locales';
import PrimeVue from 'primevue/config';
import AppHeader from './AppHeader.vue';

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  });
}

describe('AppHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  function mountHeader(title = 'Test Title') {
    const router = createTestRouter();
    return {
      wrapper: mount(AppHeader, {
        props: { title },
        global: {
          plugins: [createPinia(), router, PrimeVue, i18n],
        },
      }),
      router,
    };
  }

  it('renders the title', () => {
    const { wrapper } = mountHeader('My Page');
    expect(wrapper.text()).toContain('My Page');
  });

  it('emits toggleDrawer when menu button is clicked', async () => {
    const { wrapper } = mountHeader();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('toggleDrawer')).toHaveLength(1);
  });

  it('contains topbar-actions slot', () => {
    const { wrapper } = mountHeader();
    expect(wrapper.find('#topbar-actions').exists()).toBe(true);
  });

  it('does not render logout or theme buttons', () => {
    const { wrapper } = mountHeader();
    expect(wrapper.find('[data-testid="logout-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="theme-toggle-button"]').exists()).toBe(
      false,
    );
  });
});
