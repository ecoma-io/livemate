import { describe, it, expect, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import router from './index';

const STORAGE_KEY = 'isFakeAuthenticated';

describe('router', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has login route', () => {
    const routes = router.getRoutes();
    const login = routes.find((r) => r.name === 'login');
    expect(login).toBeDefined();
    expect(login?.path).toBe('/login');
  });

  it('has dashboard route', () => {
    const routes = router.getRoutes();
    const dashboard = routes.find((r) => r.name === 'dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard?.path).toBe('/');
  });

  it('has scripts route', () => {
    const routes = router.getRoutes();
    const scripts = routes.find((r) => r.name === 'scripts');
    expect(scripts).toBeDefined();
    expect(scripts?.path).toBe('/scripts');
  });

  it('has account route', () => {
    const routes = router.getRoutes();
    const account = routes.find((r) => r.name === 'account');
    expect(account).toBeDefined();
    expect(account?.path).toBe('/account');
  });

  it('has exactly 4 routes', () => {
    const routes = router.getRoutes();
    expect(routes.length).toBe(4);
  });

  it('login route has blank layout meta', () => {
    const routes = router.getRoutes();
    const login = routes.find((r) => r.name === 'login');
    expect(login?.meta.layout).toBe('blank');
  });

  it('redirects unauthenticated user to login', async () => {
    await router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('redirects authenticated user away from login to dashboard', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    await router.push('/'); // ensure we are not already at /login
    await flushPromises();
    await router.push('/login'); // guard should redirect away
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('allows authenticated user to access dashboard', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    await router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('dashboard');
  });
});
