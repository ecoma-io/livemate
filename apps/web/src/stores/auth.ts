import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'isFakeAuthenticated';
const VALID_USERNAME = 'vanila';
const VALID_PASSWORD = 'Vanila123';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(localStorage.getItem(STORAGE_KEY) === 'true');

  function login(username: string, password: string): boolean {
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      isAuthenticated.value = true;
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    isAuthenticated.value = false;
  }

  return { isAuthenticated, login, logout };
});
