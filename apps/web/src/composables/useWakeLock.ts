import { ref, onMounted, onUnmounted } from 'vue';

export function useWakeLock() {
  let wakeLock: WakeLockSentinel | null = null;
  const isActive = ref(false);

  async function request() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      isActive.value = true;
      wakeLock.addEventListener('release', () => {
        isActive.value = false;
      });
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') request();
  }

  onMounted(() => {
    request();
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return { isActive };
}
