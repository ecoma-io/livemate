import { test, expect } from '@playwright/test';
import {
  TestScriptTracker,
  uploadTrack,
  uploadVariant,
  generateTestMp3,
} from '../../helpers/api';
import {
  pageTitle,
  navigateTo,
  scriptTile,
  scriptCard,
  fileInput,
  deleteScriptViaMenu,
  confirmDelete,
  setSpeed,
  createScriptViaUI,
  expectToast,
  renderButtons,
  readyLabels,
  toggleScriptCard,
} from '../../helpers/pages';
import {
  monitorConsoleErrors,
  monitorNetworkErrors,
} from '../../helpers/monitoring';

test.describe('Routing', () => {
  test('root URL loads Live Studio', async ({ page }) => {
    await page.goto('/');
    await expect(pageTitle(page)).toHaveText('Live Studio');
  });

  test('navigates Soundboard → Live Studio → Soundboard roundtrip', async ({
    page,
  }) => {
    await page.goto('/scripts');
    await expect(pageTitle(page)).toHaveText('Soundboard Manager');

    await navigateTo(page, 'Live Studio');
    await expect(pageTitle(page)).toHaveText('Live Studio');

    await navigateTo(page, 'Soundboard');
    await expect(pageTitle(page)).toHaveText('Soundboard Manager');
  });
});

test.describe('Full Flow: Scripts → Player', () => {
  const tracker = new TestScriptTracker();

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('script created in scripts page appears in player', async ({ page }) => {
    // Step 1: Create script and upload file in Scripts page
    await page.goto('/scripts');
    await createScriptViaUI(page, 'Live Sound');
    await tracker.trackScriptByName('Live Sound');

    // Upload a file
    const mp3 = generateTestMp3(50);
    const card = scriptCard(page, 'Live Sound').last();
    await fileInput(card).setInputFiles({
      name: 'sound.mp3',
      mimeType: 'audio/mpeg',
      buffer: mp3,
    });
    await expectToast(page, 'uploaded');

    // Step 2: Navigate to Player
    await navigateTo(page, 'Live Studio');

    // Step 3: Script should appear as a playable tile
    await expect(scriptTile(page, 'Live Sound').first()).toBeVisible();
  });

  test('script with all speed variants visible at every speed in player', async ({
    page,
  }) => {
    // Setup via API with all speed variants
    const script = await tracker.createScript('All Speeds Flow', '#8b5cf6');
    const mp3 = generateTestMp3(30);
    const file = await uploadTrack(script.id, 'multi.mp3', mp3);
    for (const speed of [1.1, 1.2, 1.3, 1.4, 1.5]) {
      await uploadVariant(file.id, speed, generateTestMp3(25));
    }

    await page.goto('/');

    const tile = scriptTile(page, 'All Speeds Flow');

    // Visible at every speed
    for (const speed of [1.0, 1.1, 1.2, 1.3, 1.4, 1.5]) {
      await setSpeed(page, speed);
      await expect(tile).toBeVisible();
    }
  });

  test('deleting script in scripts page removes it from player', async ({
    page,
  }) => {
    const script = await tracker.createScript('To Be Deleted');
    const mp3 = generateTestMp3(20);
    await uploadTrack(script.id, 'bye.mp3', mp3);

    // Verify it's in the player
    await page.goto('/');
    await expect(scriptTile(page, 'To Be Deleted')).toBeVisible();

    // Delete in scripts page
    await page.goto('/scripts');
    const card = scriptCard(page, 'To Be Deleted');
    // Expand card to make delete button visible (it's inside v-if=isExpanded)
    await toggleScriptCard(card);
    await deleteScriptViaMenu(card);
    await confirmDelete(page);
    await expectToast(page, 'Audio Group Deleted');

    // Verify it's gone from the player
    await page.goto('/');
    await expect(scriptTile(page, 'To Be Deleted')).toBeHidden();
  });

  test('script without variant at 1.3x is hidden at 1.3x in player', async ({
    page,
  }) => {
    // Only 1.0x variant
    const script = await tracker.createScript('Partial Variants Flow');
    const mp3 = generateTestMp3(20);
    await uploadTrack(script.id, 'partial.mp3', mp3);

    await page.goto('/');

    // Visible at 1.0x
    await expect(scriptTile(page, 'Partial Variants Flow')).toBeVisible();

    // Not visible at 1.3x
    await setSpeed(page, 1.3);
    await expect(scriptTile(page, 'Partial Variants Flow')).toBeHidden();
  });

  test('script with only original file plays at 1.0x speed @webkit-incompatible', async ({
    page,
  }) => {
    const script = await tracker.createScript('Single Original', '#f59e0b');
    const mp3 = generateTestMp3(50);
    const file = await uploadTrack(script.id, 'original.mp3', mp3);

    expect(file.variants).toHaveLength(1);
    expect(file.variants[0].speed).toBe(1.0);

    const variantId = file.variants[0].id;

    // Intercept audio request
    await page.route('**/api/audio/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: generateTestMp3(2),
      });
    });

    await page.goto('/');

    const tile = scriptTile(page, 'Single Original');
    await expect(tile).toBeVisible();

    // Register request listener BEFORE clicking to avoid race condition
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/audio/'),
    );
    await tile.click();
    const audioRequest = await requestPromise;

    // Verify correct variant was requested
    expect(audioRequest.url()).toContain(`/api/audio/${variantId}`);
  });

  test('full UI workflow: create → upload → navigate → play @webkit-incompatible', async ({
    page,
  }) => {
    await page.goto('/scripts');

    // Create script via UI
    await createScriptViaUI(page, 'E2E Full Flow');
    await tracker.trackScriptByName('E2E Full Flow');

    // Upload file
    const mp3 = generateTestMp3(50);
    const card = scriptCard(page, 'E2E Full Flow').last();
    await fileInput(card).setInputFiles({
      name: 'e2e-flow.mp3',
      mimeType: 'audio/mpeg',
      buffer: mp3,
    });
    await expectToast(page, 'uploaded');

    // Intercept audio
    await page.route('**/api/audio/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: generateTestMp3(2),
      });
    });

    // Navigate to player
    await navigateTo(page, 'Live Studio');
    await expect(pageTitle(page)).toHaveText('Live Studio');

    // Script should be visible
    const tile = scriptTile(page, 'E2E Full Flow').first();
    await expect(tile).toBeVisible();

    // Register request listener BEFORE clicking to avoid race condition
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/audio/'),
    );
    await tile.click();
    await requestPromise;
  });

  test('variant status in scripts page reflects player visibility', async ({
    page,
  }) => {
    // Start with only 1.0x
    const script = await tracker.createScript('Variant Flow');
    const mp3 = generateTestMp3(20);
    const file = await uploadTrack(script.id, 'flow.mp3', mp3);

    // Verify player: visible at 1.0x, hidden at 1.2x
    await page.goto('/');
    await expect(scriptTile(page, 'Variant Flow')).toBeVisible();
    await setSpeed(page, 1.2);
    await expect(scriptTile(page, 'Variant Flow')).toBeHidden();

    // Upload 1.2x variant via API
    await uploadVariant(file.id, 1.2, generateTestMp3(15));

    // Verify scripts page reflects the new variant
    await page.goto('/scripts');
    const card = scriptCard(page, 'Variant Flow');
    await expect(readyLabels(card)).toHaveCount(2); // 1.0x + 1.2x
    await expect(renderButtons(card)).toHaveCount(4); // 1.1x, 1.3x, 1.4x, 1.5x

    // Verify player: now visible at 1.2x
    await page.goto('/');
    await setSpeed(page, 1.2);
    await expect(scriptTile(page, 'Variant Flow')).toBeVisible();
  });

  // ─── Operational Error Detection ───────────────────────────────

  test('no errors during complete workflow', async ({ page }) => {
    const consoleErrors = monitorConsoleErrors(page);
    const networkErrors = monitorNetworkErrors(page);

    // Create a script
    const script = await tracker.createScript('Error Free Flow');
    const mp3 = generateTestMp3(30);
    await uploadTrack(script.id, 'clean.mp3', mp3);

    // Navigate through the app
    await page.goto('/scripts');
    await expect(scriptCard(page, 'Error Free Flow')).toBeVisible();

    await navigateTo(page, 'Live Studio');
    await expect(scriptTile(page, 'Error Free Flow')).toBeVisible();

    await navigateTo(page, 'Soundboard');
    await expect(scriptCard(page, 'Error Free Flow')).toBeVisible();

    // Filter out known benign errors
    const relevantErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('service-worker') &&
        !e.includes('403'),
    );
    expect(relevantErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });
});
