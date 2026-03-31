/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import router from '../router';
import { createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import i18n from '../locales';
import App from './App.vue';

describe('App', () => {
  it('renders router view', async () => {
    localStorage.setItem('isFakeAuthenticated', 'true');
    await router.push('/');
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router, PrimeVue, ToastService, i18n],
      },
    });
    await router.isReady();
    expect(wrapper.html()).toContain('Live Mate');
    localStorage.clear();
  });
});
