import { createRouter, createWebHistory } from 'vue-router';

const STORAGE_KEY = 'isFakeAuthenticated';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login/LoginView.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/dashboard/DashboardView.vue'),
    },
    {
      path: '/scripts',
      name: 'scripts',
      component: () => import('../views/scripts/ScriptView.vue'),
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('../views/account/AccountView.vue'),
    },
  ],
});

router.beforeEach((to) => {
  const isAuthenticated = localStorage.getItem(STORAGE_KEY) === 'true';
  if (!isAuthenticated && to.name !== 'login') {
    return { name: 'login' };
  }
  if (isAuthenticated && to.name === 'login') {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
