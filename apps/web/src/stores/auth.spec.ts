import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth';

const STORAGE_KEY = 'isFakeAuthenticated';

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('initializes as not authenticated when localStorage is empty', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
  });

  it('initializes as authenticated when localStorage has isFakeAuthenticated=true', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(true);
  });

  it('login returns true and sets isAuthenticated for correct credentials', () => {
    const store = useAuthStore();
    const result = store.login('vanila', 'Vanila123');
    expect(result).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('login returns false for wrong username', () => {
    const store = useAuthStore();
    const result = store.login('wrong', 'Vanila123');
    expect(result).toBe(false);
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('login returns false for wrong password', () => {
    const store = useAuthStore();
    const result = store.login('vanila', 'wrong');
    expect(result).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });

  it('login returns false for empty credentials', () => {
    const store = useAuthStore();
    const result = store.login('', '');
    expect(result).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });

  it('logout clears localStorage and sets isAuthenticated to false', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(true);
    store.logout();
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
