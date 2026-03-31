/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import PrimeVue from 'primevue/config';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import i18n from '../../locales';
import LoginView from './LoginView.vue';
import { useAuthStore } from '../../stores/auth';

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        name: 'dashboard',
        component: { template: '<div>Dashboard</div>' },
      },
      { path: '/login', name: 'login', component: LoginView },
    ],
  });
}

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function mountLogin() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createTestRouter();
    return {
      wrapper: mount(LoginView, {
        global: {
          plugins: [pinia, router, PrimeVue, i18n],
          components: { InputText, Button },
        },
      }),
      router,
    };
  }

  it('renders title and subtitle', () => {
    const { wrapper } = mountLogin();
    expect(wrapper.text()).toContain('LiveMate');
    expect(wrapper.text()).toContain('Sign in to continue');
  });

  it('renders username and password fields', () => {
    const { wrapper } = mountLogin();
    expect(wrapper.find('[data-testid="username-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true);
  });

  it('shows error message on invalid credentials', async () => {
    const { wrapper } = mountLogin();
    await wrapper.find('[data-testid="username-input"]').setValue('wrong');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[data-testid="error-message"]').text()).toContain(
      'Invalid username or password',
    );
  });

  it('does not show error message initially', () => {
    const { wrapper } = mountLogin();
    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(false);
  });

  it('calls auth.login with submitted credentials', async () => {
    const { wrapper } = mountLogin();
    const auth = useAuthStore();
    const loginSpy = vi.spyOn(auth, 'login');

    await wrapper.find('[data-testid="username-input"]').setValue('vanila');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(loginSpy).toHaveBeenCalledWith('vanila', '');
  });

  it('redirects to dashboard on successful login', async () => {
    const { wrapper, router } = mountLogin();
    await wrapper.find('[data-testid="username-input"]').setValue('vanila');

    const auth = useAuthStore();
    vi.spyOn(auth, 'login').mockReturnValue(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('outer container has primary background class for mobile', () => {
    const { wrapper } = mountLogin();
    const outer = wrapper.find('.bg-primary-800');
    expect(outer.exists()).toBe(true);
  });

  it('card has full-height class for mobile and max-width override for desktop', () => {
    const { wrapper } = mountLogin();
    const card = wrapper.find('.h-full');
    expect(card.exists()).toBe(true);
    expect(card.classes().some((c) => c === 'sm:max-w-sm')).toBe(true);
  });
});
