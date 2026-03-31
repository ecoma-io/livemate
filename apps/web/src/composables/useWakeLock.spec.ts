import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useWakeLock } from './useWakeLock';

describe('useWakeLock', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mountWithWakeLock(wakeLockSupported = true) {
    const mockRelease = vi.fn();
    const mockWakeLock = {
      released: false,
      release: mockRelease,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onrelease: null,
      type: 'screen' as WakeLockType,
      dispatchEvent: vi.fn(),
    };

    if (wakeLockSupported) {
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: vi.fn().mockResolvedValue(mockWakeLock),
        },
        configurable: true,
        writable: true,
      });
    } else {
      const nav = navigator as any;
      delete nav.wakeLock;
    }

    let result: ReturnType<typeof useWakeLock>;
    const wrapper = mount(
      defineComponent({
        setup() {
          result = useWakeLock();
          return {};
        },
        render: () => null,
      }),
    );

    return { result: result!, wrapper, mockWakeLock };
  }

  it('requests wake lock on mount when supported', async () => {
    const { mockWakeLock } = mountWithWakeLock(true);
    await nextTick();
    await nextTick();
    await nextTick();

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
    expect(mockWakeLock.addEventListener).toHaveBeenCalledWith('release', expect.any(Function));
  });

  it('sets isActive to false when wake lock is released', async () => {
    const { result, mockWakeLock } = mountWithWakeLock(true);
    await nextTick();
    await nextTick();
    await nextTick();

    // Get the release callback that was passed to addEventListener
    const releaseCallback = mockWakeLock.addEventListener.mock.calls.find(
      (call: any[]) => call[0] === 'release',
    )?.[1];
    expect(releaseCallback).toBeTruthy();

    // Trigger the release
    releaseCallback();
    expect(result.isActive.value).toBe(false);
  });

  it('re-requests wake lock on visibility change', async () => {
    mountWithWakeLock(true);
    await nextTick();
    await nextTick();
    await nextTick();

    // Clear previous calls
    (navigator.wakeLock.request as any).mockClear();

    // Simulate visibility change to visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();
    await nextTick();
    await nextTick();

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
  });

  it('removes event listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { wrapper } = mountWithWakeLock(true);
    await nextTick();
    await nextTick();

    wrapper.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('does nothing when wakeLock not supported', async () => {
    mountWithWakeLock(false);
    await nextTick();
    // Should not throw
  });

  it('handles wake lock request error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: vi.fn().mockRejectedValue(new Error('not allowed')),
      },
      configurable: true,
      writable: true,
    });

    mount(
      defineComponent({
        setup() {
          useWakeLock();
          return {};
        },
        render: () => null,
      }),
    );

    await nextTick();
    await nextTick();
    await nextTick();

    expect(warnSpy).toHaveBeenCalledWith('Wake Lock error:', expect.any(Error));
    warnSpy.mockRestore();
  });
});
