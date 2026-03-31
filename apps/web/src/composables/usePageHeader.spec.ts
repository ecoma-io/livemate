import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import i18n from '../locales';
import { usePageHeader } from './usePageHeader';
import { useLayoutStore } from '../stores/layout';

describe('usePageHeader', () => {
  it('sets page title and isActive on mount', async () => {
    let result: ReturnType<typeof usePageHeader>;
    const pinia = createPinia();

    mount(
      defineComponent({
        setup() {
          result = usePageHeader('My Title');
          return {};
        },
        render: () => null,
      }),
      {
        global: { plugins: [pinia, i18n] },
      },
    );

    await nextTick();

    expect(result!.isActive.value).toBe(true);
    const layout = useLayoutStore(pinia);
    expect(layout.pageTitle).toBe('My Title');
  });

  it('sets isActive to false on unmount', async () => {
    let result: ReturnType<typeof usePageHeader>;
    const pinia = createPinia();

    const wrapper = mount(
      defineComponent({
        setup() {
          result = usePageHeader('Test');
          return {};
        },
        render: () => null,
      }),
      {
        global: { plugins: [pinia, i18n] },
      },
    );

    await nextTick();
    expect(result!.isActive.value).toBe(true);

    wrapper.unmount();
    expect(result!.isActive.value).toBe(false);
  });
});
