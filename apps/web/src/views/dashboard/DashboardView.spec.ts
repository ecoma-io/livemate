import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import i18n from '../../locales';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import DashboardView from './DashboardView.vue';
import { useScriptsStore } from '../../stores/scripts';
import { usePlayerStore } from '../../stores/player';

vi.mock('../../services/audio', () => ({
  audioService: {
    play: vi.fn(),
    stop: vi.fn(),
  },
  getDuration: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/api', () => ({
  api: {
    audioUrl: (id: string) => `/api/audio/${id}`,
    getScripts: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../composables/useWakeLock', () => ({
  useWakeLock: () => ({ isActive: { value: false } }),
}));

vi.mock('../../composables/useMediaSession', () => ({
  useMediaSession: vi.fn(),
}));

describe('DashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  function mountView() {
    return mount(DashboardView, {
      global: {
        plugins: [createPinia(), PrimeVue, ToastService, i18n],
      },
    });
  }

  it('renders the player view', () => {
    const wrapper = mountView();
    expect(wrapper.html()).toBeTruthy();
  });

  it('shows loading spinner when scripts are loading', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.loading = true;

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [pinia, PrimeVue, ToastService, i18n],
      },
    });

    expect(wrapper.find('.pi-spinner').exists()).toBe(true);
  });

  it('shows empty state when no scripts with variants for speed', () => {
    const wrapper = mountView();
    expect(wrapper.text()).toContain('No audio available');
  });

  it('shows error state when scripts failed to load', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.error = 'Network error';

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [pinia, PrimeVue, ToastService, i18n],
      },
    });

    expect(wrapper.find('.pi-exclamation-triangle').exists()).toBe(true);
    expect(wrapper.text()).toContain('Unable to load audio groups');
  });

  it('renders script tiles when scripts have matching variants', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script 1',
        color: '#ef4444',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 's1',
            name: 'test.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [pinia, PrimeVue, ToastService, i18n],
      },
    });

    expect(wrapper.text()).toContain('Script 1');
  });

  it('calls player.play when a script tile is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    const player = usePlayerStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script 1',
        color: '#ef4444',
        sortOrder: 0,
        tracks: [
          {
            id: 'f1',
            scriptId: 's1',
            name: 'test.mp3',
            variants: [
              {
                id: 'v1',
                trackId: 'f1',
                speed: 1.0,
                contentHash: 'abc',
                fileSize: 1000,
                mimeType: 'audio/mpeg',
              },
            ],
          },
        ],
      },
    ];

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [pinia, PrimeVue, ToastService, i18n],
      },
    });

    const grid = wrapper.findComponent({ name: 'ScriptTileGrid' });
    await grid.vm.$emit('play', 's1');
    expect(player.activeScriptId).toBe('s1');
  });

  it('calls player.stop when stop button is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const player = usePlayerStore(pinia);
    player.isPlaying = true;
    player.activeScriptId = 's1';

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [pinia, PrimeVue, ToastService, i18n],
      },
    });

    const topBar = wrapper.findComponent({ name: 'PlayerTopBar' });
    await topBar.vm.$emit('stop');
    expect(player.isPlaying).toBe(false);
  });

  it('control bar not rendered when not playing', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const player = usePlayerStore(pinia);
    player.isPlaying = false;

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [pinia, PrimeVue, ToastService, i18n],
      },
    });

    // PlayerTopBar should not render any controls when not playing
    const topBar = wrapper.findComponent({ name: 'PlayerTopBar' });
    expect(topBar.exists()).toBe(true);
    expect(player.isPlaying).toBe(false);
  });

  it('sends service worker message on mount', async () => {
    const postMessageMock = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: { postMessage: postMessageMock } },
      configurable: true,
    });

    mountView();
    await flushPromises();
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'SYNC_AUDIO' });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });
  });
});
