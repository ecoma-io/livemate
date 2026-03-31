import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useLayoutStore } from '../stores/layout';

/**
 * Sets the global top-bar page title and returns `isActive` for use as a
 * Teleport guard — ensures that actions from deactivated (keep-alive) views
 * are not rendered in the top bar while the view is in the background.
 */
export function usePageHeader(title: string) {
  const layout = useLayoutStore();
  const isActive = ref(false);

  function activate() {
    isActive.value = true;
    layout.pageTitle = title;
  }

  function deactivate() {
    isActive.value = false;
  }

  // With keep-alive: activated/deactivated fire on every switch
  // Without keep-alive: mounted/unmounted fire on every navigation
  onMounted(activate);
  onUnmounted(deactivate);
  onActivated(activate);
  onDeactivated(deactivate);

  return { isActive };
}
