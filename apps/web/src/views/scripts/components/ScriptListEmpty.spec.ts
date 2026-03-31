import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import ScriptListEmpty from './ScriptListEmpty.vue';

describe('ScriptListEmpty', () => {
  function mountComponent() {
    return mount(ScriptListEmpty, {
      global: {
        plugins: [createPinia(), PrimeVue, i18n],
      },
    });
  }

  it('renders heading', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('No Audio Groups Yet');
  });

  it('renders description', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Get started by creating an Audio Group');
  });

  it('renders CTA button', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Create Your First Audio Group');
  });

  it('emits addScript when button is clicked', async () => {
    const wrapper = mountComponent();
    const button = wrapper.findComponent({ name: 'Button' });
    await button.trigger('click');
    expect(wrapper.emitted('addScript')).toHaveLength(1);
  });
});
