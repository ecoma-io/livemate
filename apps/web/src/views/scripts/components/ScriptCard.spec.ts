import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import i18n from '../../../locales';
import PrimeVue from 'primevue/config';
import ScriptCard from './ScriptCard.vue';

vi.mock('../../../config/apiConfig', () => ({
  API_BASE_URL: 'http://test-api',
}));

describe('ScriptCard', () => {
  const mockScript = {
    id: 's1',
    name: 'Test Script',
    color: '#ef4444',
    sortOrder: 0,
    tracks: [
      {
        id: 'f1',
        scriptId: 's1',
        name: 'track1.mp3',
        variants: [
          {
            id: 'v1',
            trackId: 'f1',
            speed: 1.0,
            contentHash: 'abc',
            fileSize: 1000,
            mimeType: 'audio/mpeg',
            duration: 65.0,
          },
          {
            id: 'v2',
            trackId: 'f1',
            speed: 1.2,
            contentHash: 'def',
            fileSize: 800,
            mimeType: 'audio/mpeg',
            duration: null,
          },
        ],
      },
    ],
  };

  const emptyScript = {
    id: 's2',
    name: 'Empty Script',
    color: '#3b82f6',
    sortOrder: 1,
    tracks: [],
  };

  const scriptWithMissingVariants = {
    ...mockScript,
    tracks: [
      {
        ...mockScript.tracks[0],
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
  };

  function mountCard(script = mockScript, props = {}) {
    return mount(ScriptCard, {
      props: { script, isRendering: false, isExpanded: true, ...props },
      global: {
        plugins: [createPinia(), PrimeVue, i18n],
        stubs: {
          Teleport: true,
          Card: {
            template: '<div><slot name="content" /></div>',
          },
          ScriptForm: {
            name: 'ScriptForm',
            props: ['visible', 'mode', 'scriptId', 'initialName'],
            emits: ['update:visible'],
            template: '<div />',
          },
          ScriptColorDialog: {
            name: 'ScriptColorDialog',
            props: ['visible', 'scriptId', 'currentColor'],
            emits: ['update:visible', 'colorChange'],
            template: '<div />',
          },
        },
      },
    });
  }

  it('renders script name', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Test Script');
  });

  it('renders audio file name', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('track1.mp3');
  });

  it('shows variant count notification circle with file count', () => {
    const wrapper = mountCard();
    const badge = wrapper.find('[data-testid="variant-count-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('1');
  });

  it('hides variant count notification circle when no audio files', () => {
    const wrapper = mountCard(emptyScript);
    const badge = wrapper.find('[data-testid="variant-count-badge"]');
    expect(badge.exists()).toBe(false);
  });

  it('variant-count badge is a direct child of the card wrapper, not inside the expand button', () => {
    const wrapper = mountCard();
    const badge = wrapper.find('[data-testid="variant-count-badge"]');
    expect(badge.exists()).toBe(true);
    // Badge must be a direct child of the outer wrapper div (div.relative),
    // not nested inside the chevron button group or Card content
    expect(badge.element.parentElement?.classList.contains('relative')).toBe(
      true,
    );
  });

  it('card has left border style with script color', () => {
    const wrapper = mountCard();
    expect(wrapper.html()).toContain('border-left-color');
  });

  it('renders speed rows for each speed', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('1.0x');
    expect(wrapper.text()).toContain('1.1x');
    expect(wrapper.text()).toContain('1.2x');
  });

  it('shows Ready status for existing variants', () => {
    const wrapper = mountCard();
    const readyTexts = wrapper
      .findAll('span')
      .filter((s) => s.text() === 'Ready');
    expect(readyTexts.length).toBeGreaterThan(0);
  });

  it('shows Missing status for missing variants', () => {
    const wrapper = mountCard();
    const missingTexts = wrapper
      .findAll('span')
      .filter((s) => s.text() === 'Missing');
    expect(missingTexts.length).toBeGreaterThan(0);
  });

  it('renders upload drop zone', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('click to select');
  });

  it('renders upload drop zone for script with no audio files', () => {
    const wrapper = mountCard(emptyScript);
    expect(wrapper.text()).toContain('click to select');
  });

  it('shows inline action buttons when expanded', () => {
    const wrapper = mountCard(mockScript, { isExpanded: true });
    // Rename, Change Color, Delete Group buttons should be visible
    const buttons = wrapper.findAllComponents({ name: 'Button' });
    const labels = buttons.map((b) => b.props('label'));
    expect(labels).toContain('Rename');
    expect(labels).toContain('Change Color');
    expect(labels).toContain('Delete Group');
  });

  it('hides inline action buttons when collapsed', () => {
    const wrapper = mountCard(mockScript, { isExpanded: false });
    const buttons = wrapper.findAllComponents({ name: 'Button' });
    const labels = buttons.map((b) => b.props('label'));
    expect(labels).not.toContain('Rename');
    expect(labels).not.toContain('Change Color');
    expect(labels).not.toContain('Delete Group');
  });

  it('emits deleteScript when inline delete button is clicked', async () => {
    const wrapper = mountCard(mockScript, { isExpanded: true });
    const deleteBtn = wrapper
      .findAllComponents({ name: 'Button' })
      .find((b) => b.props('label') === 'Delete Group');
    expect(deleteBtn).toBeTruthy();
    await deleteBtn!.trigger('click');
    expect(wrapper.emitted('deleteScript')).toBeTruthy();
    expect(wrapper.emitted('deleteScript')![0]).toEqual(['s1']);
  });

  it('emits deleteTrack event when 1.0x trash button is clicked', async () => {
    const wrapper = mountCard();
    const trashButtons = wrapper
      .findAllComponents({ name: 'Button' })
      .filter(
        (c) =>
          c.props('icon') === 'pi pi-trash' &&
          c.props('severity') === 'danger' &&
          c.props('label') !== 'Delete Group',
      );
    // danger trash button without Delete Group label = delete file (1.0x row)
    expect(trashButtons.length).toBeGreaterThanOrEqual(1);
    await trashButtons[0].trigger('click');
    expect(wrapper.emitted('deleteTrack')).toBeTruthy();
    expect(wrapper.emitted('deleteTrack')![0]).toEqual(['f1']);
  });

  it('emits deleteVariant event when variant trash button is clicked', async () => {
    const wrapper = mountCard();
    const trashButtons = wrapper
      .findAllComponents({ name: 'Button' })
      .filter(
        (c) =>
          c.props('icon') === 'pi pi-trash' &&
          c.props('severity') === 'secondary',
      );
    // secondary trash button = delete variant (1.2x row in mockScript)
    expect(trashButtons.length).toBeGreaterThanOrEqual(1);
    await trashButtons[0].trigger('click');
    expect(wrapper.emitted('deleteVariant')).toBeTruthy();
    expect(wrapper.emitted('deleteVariant')![0]).toEqual(['v2']);
  });

  it('shows render all button when missing variants exist', () => {
    const wrapper = mountCard(scriptWithMissingVariants, { isExpanded: true });
    const buttons = wrapper.findAllComponents({ name: 'Button' });
    const labels = buttons.map((b) => b.props('label'));
    expect(labels).toContain('Render All Missing');
  });

  it('hides render all button when all variants ready', () => {
    const fullScript = {
      ...mockScript,
      tracks: [
        {
          ...mockScript.tracks[0],
          variants: [
            {
              id: 'v1',
              trackId: 'f1',
              speed: 1.0,
              contentHash: 'abc',
              fileSize: 1000,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v2',
              trackId: 'f1',
              speed: 1.1,
              contentHash: 'def',
              fileSize: 800,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v3',
              trackId: 'f1',
              speed: 1.2,
              contentHash: 'ghi',
              fileSize: 750,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v4',
              trackId: 'f1',
              speed: 1.3,
              contentHash: 'jkl',
              fileSize: 700,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v5',
              trackId: 'f1',
              speed: 1.4,
              contentHash: 'mno',
              fileSize: 650,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v6',
              trackId: 'f1',
              speed: 1.5,
              contentHash: 'pqr',
              fileSize: 600,
              mimeType: 'audio/mpeg',
            },
          ],
        },
      ],
    };
    const wrapper = mountCard(fullScript, { isExpanded: true });
    const buttons = wrapper.findAllComponents({ name: 'Button' });
    const labels = buttons.map((b) => b.props('label'));
    expect(labels).not.toContain('Render All Missing');
  });

  it('emits renderAllMissing when render all button is clicked', async () => {
    const wrapper = mountCard(scriptWithMissingVariants, { isExpanded: true });
    const renderAllBtn = wrapper
      .findAllComponents({ name: 'Button' })
      .find((b) => b.props('label') === 'Render All Missing');
    expect(renderAllBtn).toBeTruthy();
    await renderAllBtn!.trigger('click');
    expect(wrapper.emitted('renderAllMissing')).toBeTruthy();
  });

  it('emits renderVariant when render button is clicked for a missing speed', async () => {
    const wrapper = mountCard(scriptWithMissingVariants);
    const refreshButtons = wrapper
      .findAllComponents({ name: 'Button' })
      .filter((c) => c.props('icon') === 'pi pi-refresh');
    expect(refreshButtons.length).toBeGreaterThan(0);
    await refreshButtons[0].trigger('click');
    expect(wrapper.emitted('renderVariant')).toBeTruthy();
  });

  it('clicking inline rename button opens ScriptForm dialog in rename mode', async () => {
    const wrapper = mountCard(mockScript, { isExpanded: true });
    const renameBtn = wrapper
      .findAllComponents({ name: 'Button' })
      .find((b) => b.props('label') === 'Rename');
    expect(renameBtn).toBeTruthy();
    await renameBtn!.trigger('click');
    await wrapper.vm.$nextTick();
    const scriptForm = wrapper.findComponent({ name: 'ScriptForm' });
    expect(scriptForm.exists()).toBe(true);
    expect(scriptForm.props('visible')).toBe(true);
    expect(scriptForm.props('mode')).toBe('rename');
  });

  it('ScriptForm receives correct scriptId and initialName when rename is opened', async () => {
    const wrapper = mountCard(mockScript, { isExpanded: true });
    const renameBtn = wrapper
      .findAllComponents({ name: 'Button' })
      .find((b) => b.props('label') === 'Rename');
    await renameBtn!.trigger('click');
    await wrapper.vm.$nextTick();
    const scriptForm = wrapper.findComponent({ name: 'ScriptForm' });
    expect(scriptForm.props('scriptId')).toBe('s1');
    expect(scriptForm.props('initialName')).toBe('Test Script');
  });

  it('shows content when isExpanded is true', () => {
    const wrapper = mountCard(mockScript, { isExpanded: true });
    expect(wrapper.find('[role="button"]').isVisible()).toBe(true);
  });

  it('hides content when isExpanded is false', () => {
    const wrapper = mountCard(mockScript, { isExpanded: false });
    expect(wrapper.find('[role="button"]').isVisible()).toBe(false);
  });

  it('emits toggleExpand when chevron button is clicked', async () => {
    const wrapper = mountCard(mockScript, { isExpanded: true });
    const chevron = wrapper.find('button[aria-label="Collapse tracks"]');
    expect(chevron.exists()).toBe(true);
    await chevron.trigger('click');
    expect(wrapper.emitted('toggleExpand')).toBeTruthy();
  });

  it('emits toggleExpand when script name is clicked', async () => {
    const wrapper = mountCard(mockScript, { isExpanded: false });
    const chevron = wrapper.find('button[aria-label="Expand tracks"]');
    expect(chevron.exists()).toBe(true);
    await chevron.trigger('click');
    expect(wrapper.emitted('toggleExpand')).toBeTruthy();
  });

  it('shows missing variants indicator when collapsed and has missing variants', () => {
    const wrapper = mountCard(scriptWithMissingVariants, { isExpanded: false });
    const indicator = wrapper.find(
      '[data-testid="missing-variants-indicator"]',
    );
    expect(indicator.exists()).toBe(true);
  });

  it('shows amber border class when collapsed and has missing variants', () => {
    const wrapper = mountCard(scriptWithMissingVariants, { isExpanded: false });
    expect(wrapper.html()).toContain('border-amber-400');
  });

  it('hides missing variants indicator when isExpanded is true', () => {
    const wrapper = mountCard(scriptWithMissingVariants, { isExpanded: true });
    const indicator = wrapper.find(
      '[data-testid="missing-variants-indicator"]',
    );
    expect(indicator.exists()).toBe(false);
  });

  it('no amber border class when isExpanded is true', () => {
    const wrapper = mountCard(scriptWithMissingVariants, { isExpanded: true });
    expect(wrapper.html()).not.toContain('border-amber-400');
  });

  it('hides missing variants indicator when all variants are ready', () => {
    const fullScript = {
      ...mockScript,
      tracks: [
        {
          ...mockScript.tracks[0],
          variants: [
            {
              id: 'v1',
              trackId: 'f1',
              speed: 1.0,
              contentHash: 'a',
              fileSize: 1000,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v2',
              trackId: 'f1',
              speed: 1.1,
              contentHash: 'b',
              fileSize: 900,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v3',
              trackId: 'f1',
              speed: 1.2,
              contentHash: 'c',
              fileSize: 800,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v4',
              trackId: 'f1',
              speed: 1.3,
              contentHash: 'd',
              fileSize: 700,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v5',
              trackId: 'f1',
              speed: 1.4,
              contentHash: 'e',
              fileSize: 650,
              mimeType: 'audio/mpeg',
            },
            {
              id: 'v6',
              trackId: 'f1',
              speed: 1.5,
              contentHash: 'f',
              fileSize: 600,
              mimeType: 'audio/mpeg',
            },
          ],
        },
      ],
    };
    const fullWrapper = mountCard(fullScript, { isExpanded: false });
    expect(
      fullWrapper.find('[data-testid="missing-variants-indicator"]').exists(),
    ).toBe(false);
    expect(fullWrapper.html()).not.toContain('border-amber-400');
  });

  it('emits fileUpload when file input changes', async () => {
    const wrapper = mountCard();
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [mockFile],
      writable: false,
    });
    await fileInput.trigger('change');
    expect(wrapper.emitted('fileUpload')).toBeTruthy();
    expect(wrapper.emitted('fileUpload')![0]).toEqual(['s1', [mockFile]]);
  });

  it('does not emit fileUpload when file input is cleared', async () => {
    const wrapper = mountCard();
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    Object.defineProperty(fileInput.element, 'files', {
      value: [],
      writable: false,
    });
    await fileInput.trigger('change');
    expect(wrapper.emitted('fileUpload')).toBeFalsy();
  });

  it('emits fileUpload on drop event', async () => {
    const wrapper = mountCard();
    const mockFile = new File(['audio'], 'dropped.mp3', { type: 'audio/mpeg' });
    const dropZone = wrapper.find('[role="button"]');
    expect(dropZone.exists()).toBe(true);
    await dropZone.trigger('drop', { dataTransfer: { files: [mockFile] } });
    expect(wrapper.emitted('fileUpload')).toBeTruthy();
  });

  it('shows drag-over styling during dragover', async () => {
    const wrapper = mountCard();
    const dropZone = wrapper.find('[role="button"]');
    expect(dropZone.exists()).toBe(true);
    await dropZone.trigger('dragover');
    expect(dropZone.classes()).toContain('border-primary-400');
    await dropZone.trigger('dragleave');
    expect(dropZone.classes()).not.toContain('border-primary-400');
  });

  it('toggles play/pause on play button click', async () => {
    const wrapper = mountCard();
    const playButtons = wrapper
      .findAll('button')
      .filter((b) => b.find('.pi-play').exists());
    expect(playButtons.length).toBeGreaterThan(0);
    // First click: should show pause icon for the playing track
    await playButtons[0].trigger('click');
    const pauseButton = wrapper
      .findAll('button')
      .find((b) => b.find('.pi-pause').exists());
    expect(pauseButton).toBeTruthy();
    // Second click: stop playback, pause icon should disappear
    await pauseButton!.trigger('click');
    expect(
      wrapper.findAll('button').find((b) => b.find('.pi-pause').exists()),
    ).toBeUndefined();
  });

  it('clicking inline change color button opens ScriptColorDialog', async () => {
    const wrapper = mountCard(mockScript, { isExpanded: true });
    const colorBtn = wrapper
      .findAllComponents({ name: 'Button' })
      .find((b) => b.props('label') === 'Change Color');
    expect(colorBtn).toBeTruthy();
    await colorBtn!.trigger('click');
    await wrapper.vm.$nextTick();
    const colorDialog = wrapper.findComponent({ name: 'ScriptColorDialog' });
    expect(colorDialog.exists()).toBe(true);
    expect(colorDialog.props('visible')).toBe(true);
    expect(colorDialog.props('scriptId')).toBe('s1');
    expect(colorDialog.props('currentColor')).toBe('#ef4444');
  });

  it('forwards colorChange emit from ScriptColorDialog', async () => {
    const wrapper = mountCard();
    const colorDialog = wrapper.findComponent({ name: 'ScriptColorDialog' });
    await colorDialog.vm.$emit('colorChange', 's1', '#3b82f6');
    expect(wrapper.emitted('colorChange')).toBeTruthy();
    expect(wrapper.emitted('colorChange')![0]).toEqual(['s1', '#3b82f6']);
  });

  it('shows formatted duration for variant with duration', () => {
    const wrapper = mountCard();
    const durationSpan = wrapper.find('[data-testid="variant-duration"]');
    expect(durationSpan.exists()).toBe(true);
    expect(durationSpan.text()).toContain('1:05');
  });

  it('does not show duration span for variant with null duration', () => {
    const noDurationScript = {
      ...mockScript,
      tracks: [
        {
          ...mockScript.tracks[0],
          variants: [
            {
              id: 'v1',
              trackId: 'f1',
              speed: 1.0,
              contentHash: 'abc',
              fileSize: 1000,
              mimeType: 'audio/mpeg',
              duration: null,
            },
          ],
        },
      ],
    };
    const wrapper = mountCard(noDurationScript);
    expect(wrapper.find('[data-testid="variant-duration"]').exists()).toBe(
      false,
    );
  });
});
