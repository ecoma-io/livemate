import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import i18n from '../../locales';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import ScriptView from './ScriptView.vue';
import { useScriptsStore } from '../../stores/scripts';
import type { TrackData } from '../../stores/scripts';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getScripts: vi.fn().mockResolvedValue([]),
    createScript: vi.fn(),
    updateScript: vi.fn(),
    deleteScript: vi.fn(),
    reorderScripts: vi.fn(),
    uploadTrack: vi.fn(),
    deleteTrack: vi.fn(),
    uploadVariant: vi.fn(),
    deleteVariant: vi.fn(),
    audioUrl: (id: string) => `/api/audio/${id}`,
  },
}));

const { mockQueueRenderVariant } = vi.hoisted(() => ({
  mockQueueRenderVariant: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  api: mockApi,
}));

vi.mock('../../services/ffmpeg', () => ({
  ffmpegService: {
    isLoaded: false,
    load: vi.fn(),
    changeSpeed: vi.fn(),
  },
}));

vi.mock('../../composables/useAudioRenderer', () => ({
  useAudioRenderer: () => ({
    isRendering: false,
    dialogVisible: false,
    fileName: '',
    speed: 1.0,
    progress: 0,
    phase: 'idle',
    phaseLabel: '',
    errorMessage: '',
    sessionTotal: 0,
    sessionCompleted: 0,
    sessionErrorCount: 0,
    queueRenderVariant: mockQueueRenderVariant,
  }),
}));

vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    props: ['list', 'itemKey', 'handle'],
    emits: ['end'],
    template:
      '<div><slot v-for="element in list" :element="element" name="item" /></div>',
  },
}));

describe('ScriptView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  function mountView(pinia?: ReturnType<typeof createPinia>) {
    const p = pinia || createPinia();
    setActivePinia(p);
    return mount(ScriptView, {
      global: {
        plugins: [p, PrimeVue, ToastService, ConfirmationService, i18n],
        stubs: {
          Teleport: true,
          ConfirmDialog: true,
          RenderProgressDialog: true,
          ScriptForm: true,
        },
      },
    });
  }

  it('renders the script view', () => {
    const wrapper = mountView();
    expect(wrapper.html()).toBeTruthy();
  });

  it('shows loading skeletons when loading', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.loading = true;

    const wrapper = mountView(pinia);
    expect(wrapper.html()).toBeTruthy();
  });

  it('shows error state when error', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.error = 'Test error message';

    const wrapper = mountView(pinia);
    expect(wrapper.text()).toContain('Unable to load list');
    expect(wrapper.text()).toContain('Test error message');
    expect(wrapper.text()).toContain('Retry');
  });

  it('shows empty state when no scripts', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mountView(pinia);
    expect(wrapper.text()).toContain('No Audio Groups Yet');
  });

  it('shows scripts when loaded', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
      {
        id: 's2',
        name: 'Script B',
        color: '#00ff00',
        sortOrder: 1,
        tracks: [],
      },
    ];

    const wrapper = mountView(pinia);
    expect(wrapper.text()).toContain('Script A');
    expect(wrapper.text()).toContain('Script B');
  });

  it('handles script color change via ScriptCard event', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];
    mockApi.updateScript.mockResolvedValueOnce({
      id: 's1',
      name: 'Script A',
      color: '#00ff00',
      sortOrder: 0,
      tracks: [],
    });

    const wrapper = mountView(pinia);
    const scriptCard = wrapper.findComponent({ name: 'ScriptCard' });
    await scriptCard.vm.$emit('colorChange', 's1', '#00ff00');
    await flushPromises();
    expect(mockApi.updateScript).toHaveBeenCalledWith('s1', {
      color: '#00ff00',
    });
  });

  it('handles delete script via ScriptCard event', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];

    const wrapper = mountView(pinia);
    const scriptCard = wrapper.findComponent({ name: 'ScriptCard' });
    await scriptCard.vm.$emit('deleteScript', 's1');
    await flushPromises();
    // Deletion requires confirmation: API should NOT be called immediately
    expect(mockApi.deleteScript).not.toHaveBeenCalled();
  });

  it('handles file upload via ScriptCard event', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];
    const smallFile = new File(['audio-data'], 'test.mp3', {
      type: 'audio/mpeg',
    });
    Object.defineProperty(smallFile, 'size', { value: 1000 });
    mockApi.uploadTrack.mockResolvedValueOnce({
      id: 'f1',
      scriptId: 's1',
      name: 'test.mp3',
      variants: [],
    });

    const wrapper = mountView(pinia);
    const scriptCard = wrapper.findComponent({ name: 'ScriptCard' });
    await scriptCard.vm.$emit('fileUpload', 's1', [smallFile]);
    await flushPromises();
    expect(mockApi.uploadTrack).toHaveBeenCalled();
  });

  it('rejects files larger than 2MB', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];
    const bigFile = new File(['x'], 'big.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(bigFile, 'size', { value: 3 * 1024 * 1024 });

    const wrapper = mountView(pinia);
    const scriptCard = wrapper.findComponent({ name: 'ScriptCard' });
    await scriptCard.vm.$emit('fileUpload', 's1', [bigFile]);
    await flushPromises();
    expect(mockApi.uploadTrack).not.toHaveBeenCalled();
  });

  it('handles delete file via ScriptCard event', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [
          { id: 'f1', scriptId: 's1', name: 'test.mp3', variants: [] },
        ],
      },
    ];

    const wrapper = mountView(pinia);
    const scriptCard = wrapper.findComponent({ name: 'ScriptCard' });
    await scriptCard.vm.$emit('deleteTrack', 'f1');
    await flushPromises();
    // Deletion requires confirmation: API should NOT be called immediately
    expect(mockApi.deleteTrack).not.toHaveBeenCalled();
  });

  it('handles drag end for reordering in sort mode', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
      {
        id: 's2',
        name: 'Script B',
        color: '#00ff00',
        sortOrder: 1,
        tracks: [],
      },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);
    mockApi.reorderScripts.mockResolvedValueOnce(undefined);

    const wrapper = mountView(pinia);
    await flushPromises();

    // Enter sort mode via the three-dot menu → Sort Groups command
    const menuItems = (wrapper.vm as any).menuItems as Array<{
      label?: string;
      command?: () => void;
    }>;
    const sortItem = menuItems.find((item) => item.label === 'Sort Groups')!;
    sortItem.command!();
    await wrapper.vm.$nextTick();

    const draggable = wrapper.findComponent({ name: 'draggable' });
    await draggable.vm.$emit('end');
    await flushPromises();
    expect(mockApi.reorderScripts).toHaveBeenCalledWith([
      { id: 's1', sortOrder: 0 },
      { id: 's2', sortOrder: 1 },
    ]);
  });

  it('shows ScriptCard in normal mode (not sort mode)', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];

    const wrapper = mountView(pinia);
    expect(wrapper.findComponent({ name: 'ScriptCard' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'draggable' }).exists()).toBe(false);
  });

  it('enters sort mode and shows draggable instead of ScriptCard', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);

    const wrapper = mountView(pinia);
    await flushPromises();

    // Enter sort mode via the three-dot menu → Sort Groups command
    const menuItems = (wrapper.vm as any).menuItems as Array<{
      label?: string;
      command?: () => void;
    }>;
    const sortItem = menuItems.find((item) => item.label === 'Sort Groups')!;
    sortItem.command!();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: 'ScriptCard' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'draggable' }).exists()).toBe(true);
  });

  it('exits sort mode and shows ScriptCard again', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);

    const wrapper = mountView(pinia);
    await flushPromises();

    // Enter sort mode via the three-dot menu → Sort Groups command
    const menuItems = (wrapper.vm as any).menuItems as Array<{
      label?: string;
      command?: () => void;
    }>;
    const sortItem = menuItems.find((item) => item.label === 'Sort Groups')!;
    sortItem.command!();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'ScriptCard' }).exists()).toBe(false);

    // Exit sort mode via Done button
    const doneBtnEl = wrapper
      .findAll('button')
      .find((b) => b.find('.pi-check').exists())!;
    await doneBtnEl.trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'ScriptCard' }).exists()).toBe(true);
  });

  it('handles render variant via ScriptCard event', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    const file: TrackData = {
      id: 'f1',
      scriptId: 's1',
      name: 'test.mp3',
      variants: [],
    };
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [file],
      },
    ];

    const wrapper = mountView(pinia);
    const scriptCard = wrapper.findComponent({ name: 'ScriptCard' });
    await scriptCard.vm.$emit('renderVariant', file, 1.2);
    await flushPromises();
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.2);
  });

  it('handles render all missing via ScriptCard event', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    const file: TrackData = {
      id: 'f1',
      scriptId: 's1',
      name: 'test.mp3',
      variants: [],
    };
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [file],
      },
    ];

    const wrapper = mountView(pinia);
    const scriptCard = wrapper.findComponent({ name: 'ScriptCard' });
    await scriptCard.vm.$emit('renderAllMissing', [
      { file, speed: 1.2 },
      { file, speed: 1.5 },
    ]);
    await flushPromises();
    expect(mockQueueRenderVariant).toHaveBeenCalledTimes(2);
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.2);
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.5);
  });

  it('shows ScriptCard components in normal (non-sort) mode', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];

    const wrapper = mountView(pinia);
    expect(wrapper.findComponent({ name: 'ScriptCard' }).exists()).toBe(true);
  });

  it('three-dot menu contains Sort Scripts, Add Script, and Render All Missing items', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [],
      },
    ];

    const wrapper = mountView(pinia);
    const menuItems = (wrapper.vm as any).menuItems as Array<{
      label?: string;
    }>;
    const labels = menuItems.map((item) => item.label);
    expect(labels).toContain('Sort Groups');
    expect(labels).toContain('Add Audio Group');
    expect(labels).toContain('Render Missing Variants');
  });

  // ─── Accordion expand/collapse ───────────────────────────────────

  it('all ScriptCards receive isExpanded=false by default', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      { id: 's1', name: 'Script A', color: '#ff0000', sortOrder: 0, tracks: [] },
      { id: 's2', name: 'Script B', color: '#00ff00', sortOrder: 1, tracks: [] },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);

    const wrapper = mountView(pinia);
    await flushPromises();

    const cards = wrapper.findAllComponents({ name: 'ScriptCard' });
    expect(cards.length).toBe(2);
    expect(cards[0].props('isExpanded')).toBe(false);
    expect(cards[1].props('isExpanded')).toBe(false);
  });

  it('toggleExpand event from ScriptCard expands that card', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      { id: 's1', name: 'Script A', color: '#ff0000', sortOrder: 0, tracks: [] },
      { id: 's2', name: 'Script B', color: '#00ff00', sortOrder: 1, tracks: [] },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);

    const wrapper = mountView(pinia);
    await flushPromises();

    const cards = wrapper.findAllComponents({ name: 'ScriptCard' });

    // Expand first card
    await cards[0].vm.$emit('toggleExpand');
    await wrapper.vm.$nextTick();

    expect(cards[0].props('isExpanded')).toBe(true);
    expect(cards[1].props('isExpanded')).toBe(false);
  });

  it('expanding a second card collapses the first (accordion)', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      { id: 's1', name: 'Script A', color: '#ff0000', sortOrder: 0, tracks: [] },
      { id: 's2', name: 'Script B', color: '#00ff00', sortOrder: 1, tracks: [] },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);

    const wrapper = mountView(pinia);
    await flushPromises();

    const cards = wrapper.findAllComponents({ name: 'ScriptCard' });

    // Expand first card
    await cards[0].vm.$emit('toggleExpand');
    await wrapper.vm.$nextTick();
    expect(cards[0].props('isExpanded')).toBe(true);

    // Expand second card — first should collapse
    await cards[1].vm.$emit('toggleExpand');
    await wrapper.vm.$nextTick();
    expect(cards[0].props('isExpanded')).toBe(false);
    expect(cards[1].props('isExpanded')).toBe(true);
  });

  it('toggleExpand on already-expanded card collapses it', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      { id: 's1', name: 'Script A', color: '#ff0000', sortOrder: 0, tracks: [] },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);

    const wrapper = mountView(pinia);
    await flushPromises();

    const card = wrapper.findComponent({ name: 'ScriptCard' });

    // Expand
    await card.vm.$emit('toggleExpand');
    await wrapper.vm.$nextTick();
    expect(card.props('isExpanded')).toBe(true);

    // Toggle again — should collapse
    await card.vm.$emit('toggleExpand');
    await wrapper.vm.$nextTick();
    expect(card.props('isExpanded')).toBe(false);
  });

  it('Render Missing Variants menu command queues all missing variants globally', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useScriptsStore(pinia);
    const file: TrackData = {
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
    };
    store.scripts = [
      {
        id: 's1',
        name: 'Script A',
        color: '#ff0000',
        sortOrder: 0,
        tracks: [file],
      },
    ];

    const wrapper = mountView(pinia);
    const menuItems = (wrapper.vm as any).menuItems as Array<{
      label?: string;
      command?: () => void;
    }>;
    const renderAllItem = menuItems.find(
      (item) => item.label === 'Render Missing Variants',
    )!;
    renderAllItem.command!();

    // 5 missing speeds: 1.1, 1.2, 1.3, 1.4, 1.5
    expect(mockQueueRenderVariant).toHaveBeenCalledTimes(5);
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.1);
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.2);
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.3);
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.4);
    expect(mockQueueRenderVariant).toHaveBeenCalledWith(file, 1.5);
  });

  it('scriptCreated event from ScriptForm expands the newly created script', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const scripts = [
      { id: 's1', name: 'Script A', color: '#ff0000', sortOrder: 0, tracks: [] },
      { id: 's2', name: 'Script B', color: '#00ff00', sortOrder: 1, tracks: [] },
    ];
    mockApi.getScripts.mockResolvedValueOnce(scripts);

    const wrapper = mountView(pinia);
    await flushPromises();

    // Directly invoke the handler (stub's $emit does not propagate to parent in VTUR)
    await (wrapper.vm as any).handleScriptCreated('s2');
    await wrapper.vm.$nextTick();

    const cards = wrapper.findAllComponents({ name: 'ScriptCard' });
    expect(cards[0].props('isExpanded')).toBe(false);
    expect(cards[1].props('isExpanded')).toBe(true);
  });
});
