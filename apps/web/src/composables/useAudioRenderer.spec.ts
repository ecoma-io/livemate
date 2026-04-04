import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import i18n from '../locales';

// Mock dependencies
vi.mock('../services/ffmpeg', () => ({
  ffmpegService: {
    isLoaded: false,
    load: vi.fn(),
    changeSpeed: vi.fn(),
  },
}));

vi.mock('../services/audio', () => ({
  getDuration: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/api', () => ({
  api: {
    audioUrl: (id: string) => `/api/audio/${id}`,
    getScripts: vi.fn().mockResolvedValue([]),
    uploadVariant: vi.fn().mockResolvedValue({
      id: 'v-new',
      trackId: 'f1',
      speed: 1.2,
      contentHash: 'xyz',
      fileSize: 500,
      mimeType: 'audio/mpeg',
    }),
  },
}));

const mockToastAdd = vi.fn();
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

import { useAudioRenderer } from './useAudioRenderer';
import { ffmpegService } from '../services/ffmpeg';
import type { TrackData } from '../stores/scripts';

function mountComposable() {
  let result: ReturnType<typeof useAudioRenderer>;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useAudioRenderer();
        return {};
      },
      render: () => null,
    }),
    {
      global: {
        plugins: [createPinia(), i18n],
      },
    },
  );
  return { result: result!, wrapper };
}

const mockFile = (id = 'f1'): TrackData => ({
  id,
  scriptId: 's1',
  name: 'test.mp3',
  variants: [
    {
      id: `v-${id}`,
      trackId: id,
      speed: 1.0,
      contentHash: 'abc',
      fileSize: 1000,
      mimeType: 'audio/mpeg',
    },
  ],
});

describe('useAudioRenderer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(ffmpegService).isLoaded = false;
  });

  it('initializes with default state', () => {
    const { result } = mountComposable();

    expect(result.isRendering.value).toBe(false);
    expect(result.dialogVisible.value).toBe(false);
    expect(result.fileName.value).toBe('');
    expect(result.speed.value).toBe(0);
    expect(result.progress.value).toBe(0);
    expect(result.sessionTotal.value).toBe(0);
    expect(result.sessionCompleted.value).toBe(0);
    expect(result.sessionErrorCount.value).toBe(0);
  });

  it('phaseLabel returns correct label for each phase', async () => {
    const { result } = mountComposable();

    result.phase.value = 'loading';
    await nextTick();
    expect(result.phaseLabel.value).toBeTruthy();

    result.phase.value = 'downloading';
    await nextTick();
    expect(result.phaseLabel.value).toBeTruthy();

    result.phase.value = 'rendering';
    await nextTick();
    expect(result.phaseLabel.value).toBeTruthy();

    result.phase.value = 'uploading';
    await nextTick();
    expect(result.phaseLabel.value).toBeTruthy();

    result.phase.value = 'error';
    await nextTick();
    expect(result.phaseLabel.value).toBeTruthy();

    result.phase.value = 'done';
    await nextTick();
    expect(result.phaseLabel.value).toBeTruthy();
  });

  it('renderVariant goes through full flow and increments sessionCompleted', async () => {
    vi.mocked(ffmpegService).isLoaded = false;
    vi.mocked(ffmpegService.load).mockResolvedValue(undefined);
    vi.mocked(ffmpegService.changeSpeed).mockResolvedValue(
      new Blob(['rendered']),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['original-audio'])),
    } as Response);

    const { result } = mountComposable();

    await result.renderVariant(mockFile(), 1.2);

    expect(ffmpegService.load).toHaveBeenCalled();
    expect(ffmpegService.changeSpeed).toHaveBeenCalled();
    expect(result.phase.value).toBe('done');
    expect(result.sessionCompleted.value).toBe(1);
  });

  it('renderVariant does not emit success toast', async () => {
    vi.mocked(ffmpegService).isLoaded = true;
    vi.mocked(ffmpegService.changeSpeed).mockResolvedValue(
      new Blob(['rendered']),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['original-audio'])),
    } as Response);

    const { result } = mountComposable();

    await result.renderVariant(mockFile(), 1.2);

    expect(result.phase.value).toBe('done');
    expect(mockToastAdd).not.toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
  });

  // ─── Single mode error ────────────────────────────────────────────

  it('single mode: renderVariant sets phase=error and shows toast on failure', async () => {
    vi.mocked(ffmpegService).isLoaded = true;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    const { result } = mountComposable();

    await result.renderVariant(mockFile(), 1.2);

    expect(result.phase.value).toBe('error');
    expect(result.errorMessage.value).toBe('network error');
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
  });

  it('single mode: renderVariant sets phase=error if no original variant', async () => {
    vi.mocked(ffmpegService).isLoaded = true;

    const { result } = mountComposable();

    const fileWithoutOriginal: TrackData = {
      id: 'f1',
      scriptId: 's1',
      name: 'test.mp3',
      variants: [
        {
          id: 'v1',
          trackId: 'f1',
          speed: 1.5,
          contentHash: 'abc',
          fileSize: 1000,
          mimeType: 'audio/mpeg',
        },
      ],
    };

    await result.renderVariant(fileWithoutOriginal, 1.2);

    expect(result.phase.value).toBe('error');
  });

  it('does not render if already rendering', async () => {
    const { result } = mountComposable();

    result.isRendering.value = true;

    await result.renderVariant(mockFile(), 1.2);

    expect(ffmpegService.load).not.toHaveBeenCalled();
  });

  // ─── Session tracking ─────────────────────────────────────────────

  it('queueRenderVariant sets sessionTotal=1 and sessionCompleted=1 on success', async () => {
    vi.mocked(ffmpegService).isLoaded = true;
    vi.mocked(ffmpegService.changeSpeed).mockResolvedValue(
      new Blob(['rendered']),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['original-audio'])),
    } as Response);

    const { result } = mountComposable();

    result.queueRenderVariant(mockFile(), 1.2);

    await vi.waitFor(() => {
      expect(result.phase.value).toBe('done');
    });

    expect(result.sessionTotal.value).toBe(1);
    expect(result.sessionCompleted.value).toBe(1);
    expect(result.sessionErrorCount.value).toBe(0);
  });

  it('batch mode: errors increment sessionErrorCount and do not block queue', async () => {
    vi.mocked(ffmpegService).isLoaded = true;
    vi.mocked(ffmpegService.changeSpeed).mockResolvedValue(
      new Blob(['rendered']),
    );
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('fail first'))
      .mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['original-audio'])),
      } as Response);

    const { result } = mountComposable();

    const file2: TrackData = {
      id: 'f2',
      scriptId: 's1',
      name: 'second.mp3',
      variants: [
        {
          id: 'v2',
          trackId: 'f2',
          speed: 1.0,
          contentHash: 'def',
          fileSize: 1000,
          mimeType: 'audio/mpeg',
        },
      ],
    };

    result.queueRenderVariant(mockFile(), 1.2);
    result.queueRenderVariant(file2, 1.2);

    await vi.waitFor(() => {
      expect(result.phase.value).toBe('done');
    });

    expect(result.sessionTotal.value).toBe(2);
    expect(result.sessionErrorCount.value).toBe(1);
    expect(result.sessionCompleted.value).toBe(1);
    // No error toast in batch mode
    expect(mockToastAdd).not.toHaveBeenCalled();
    // Phase never set to 'error' in batch
    expect(result.phase.value).toBe('done');
  });

  it('batch mode: does not show phase=error even on failure', async () => {
    vi.mocked(ffmpegService).isLoaded = true;
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'));

    const { result } = mountComposable();

    result.queueRenderVariant(mockFile('f1'), 1.2);
    result.queueRenderVariant(mockFile('f2'), 1.2);

    await vi.waitFor(() => {
      expect(result.phase.value).toBe('done');
    });

    expect(result.sessionErrorCount.value).toBe(2);
    expect(result.phase.value).toBe('done');
    expect(mockToastAdd).not.toHaveBeenCalled();
  });

  it('new queueRenderVariant call after session resets counters', async () => {
    vi.mocked(ffmpegService).isLoaded = true;
    vi.mocked(ffmpegService.changeSpeed).mockResolvedValue(
      new Blob(['rendered']),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['original-audio'])),
    } as Response);

    const { result } = mountComposable();

    // First session
    result.queueRenderVariant(mockFile(), 1.2);
    await vi.waitFor(() => expect(result.phase.value).toBe('done'));
    expect(result.sessionTotal.value).toBe(1);
    expect(result.sessionCompleted.value).toBe(1);

    // Simulate dialog close (triggers session reset via watcher)
    result.dialogVisible.value = false;
    await nextTick();

    // Second session
    result.queueRenderVariant(mockFile(), 1.3);
    await vi.waitFor(() => expect(result.phase.value).toBe('done'));

    expect(result.sessionTotal.value).toBe(1);
    expect(result.sessionCompleted.value).toBe(1);
  });

  it('skips ffmpeg load when already loaded', async () => {
    vi.mocked(ffmpegService).isLoaded = true;
    vi.mocked(ffmpegService.changeSpeed).mockResolvedValue(
      new Blob(['rendered']),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['original-audio'])),
    } as Response);

    const { result } = mountComposable();

    await result.renderVariant(mockFile(), 1.2);

    expect(ffmpegService.load).not.toHaveBeenCalled();
    expect(result.phase.value).toBe('done');
  });
});
