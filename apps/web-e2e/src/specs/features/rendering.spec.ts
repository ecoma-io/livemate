import { test, expect } from '@playwright/test';
import {
  TestScriptTracker,
  uploadTrack,
  uploadVariant,
  generateTestMp3,
} from '../../helpers/api';
import {
  scriptCard,
  renderButtons,
  renderDialog,
  readyLabels,
  missingLabels,
  toggleScriptCard,
  clickRenderAllMissingInCard,
  blockFfmpegLoad,
} from '../../helpers/pages';

test.describe('Rendering Speed Variants', () => {
  const tracker = new TestScriptTracker();

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  // ─── Render Button States ───────────────────────────────────────

  test('shows render buttons for missing variants', async ({ page }) => {
    const script = await tracker.createScript('Render Buttons');
    await uploadTrack(script.id, 'test.mp3', generateTestMp3(20));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Render Buttons');
    // 5 render buttons: one for each RENDER_SPEED (1.1x-1.5x)
    await expect(renderButtons(card)).toHaveCount(5);
  });

  test('shows Ready when variant exists', async ({ page }) => {
    const script = await tracker.createScript('Ready Badge');
    const file = await uploadTrack(script.id, 'test.mp3', generateTestMp3(20));
    await uploadVariant(file.id, 1.1, generateTestMp3(15));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Ready Badge');
    // 2 Ready (1.0x + 1.1x), 4 Missing (1.2x-1.5x), 4 render buttons
    await expect(readyLabels(card)).toHaveCount(2);
    await expect(missingLabels(card)).toHaveCount(4);
    await expect(renderButtons(card)).toHaveCount(4);
  });

  // ─── Render Dialog UI ──────────────────────────────────────────

  test('render dialog appears when clicking render button', async ({
    page,
  }) => {
    const script = await tracker.createScript('Dialog Test');
    await uploadTrack(script.id, 'dialog-test.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'Dialog Test');
    await toggleScriptCard(card);
    await renderButtons(card).first().click();

    const dialog = renderDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Audio Processing')).toBeVisible();
    await expect(dialog.getByText('dialog-test.mp3')).toBeVisible();
    await expect(dialog.getByText('Initializing engine...')).toBeVisible();
  });

  test('render dialog shows file name and target speed', async ({ page }) => {
    const script = await tracker.createScript('Speed Info');
    await uploadTrack(script.id, 'speed-info.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'Speed Info');
    await toggleScriptCard(card);
    // Click the last render button (1.5x is the last RENDER_SPEED)
    await renderButtons(card).last().click();

    const dialog = renderDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('speed-info.mp3')).toBeVisible();
    await expect(dialog.getByText('1.5x')).toBeVisible();
  });

  test('single mode: dialog shows exactly one progress bar', async ({
    page,
  }) => {
    const script = await tracker.createScript('Single Progress Bar');
    await uploadTrack(script.id, 'single.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'Single Progress Bar');
    await toggleScriptCard(card);
    await renderButtons(card).first().click();

    const dialog = renderDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('.p-progressbar')).toHaveCount(1);
  });

  test('batch mode: dialog shows two progress bars', async ({ page }) => {
    const script = await tracker.createScript('Batch Progress Bar');
    await uploadTrack(script.id, 'batch1.mp3', generateTestMp3(20));
    await uploadTrack(script.id, 'batch2.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'Batch Progress Bar');
    await toggleScriptCard(card);
    await clickRenderAllMissingInCard(card);

    const dialog = renderDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    // Batch mode: overall bar + current file bar
    await expect(dialog.locator('.p-progressbar')).toHaveCount(2);
  });

  test('batch mode: dialog shows files progress label', async ({ page }) => {
    const script = await tracker.createScript('Batch Count Label');
    await uploadTrack(script.id, 'count1.mp3', generateTestMp3(20));
    await uploadTrack(script.id, 'count2.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'Batch Count Label');
    await toggleScriptCard(card);
    await clickRenderAllMissingInCard(card);

    const dialog = renderDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    // Should show X / N tracks label (0 completed, 10 total: 2 files × 5 speeds)
    await expect(dialog.getByText('/ 10 tracks')).toBeVisible();
  });

  // ─── Concurrent Render Blocking ────────────────────────────────

  test('all render buttons are disabled during rendering', async ({ page }) => {
    const script = await tracker.createScript('Concurrent Block');
    await uploadTrack(script.id, 'file1.mp3', generateTestMp3(20));
    await uploadTrack(script.id, 'file2.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'Concurrent Block');
    await toggleScriptCard(card);
    const btns = renderButtons(card);

    // 2 files × 5 render speeds = 10 render buttons
    await expect(btns).toHaveCount(10);

    // Start rendering first file
    await btns.first().click();
    await expect(renderDialog(page)).toBeVisible({ timeout: 5000 });

    // ALL render buttons should be disabled
    const count = await btns.count();
    for (let i = 0; i < count; i++) {
      await expect(btns.nth(i)).toBeDisabled();
    }
  });

  test('render buttons across multiple scripts are disabled during rendering', async ({
    page,
  }) => {
    const scriptA = await tracker.createScript('Render A');
    const scriptB = await tracker.createScript('Render B');
    await uploadTrack(scriptA.id, 'a.mp3', generateTestMp3(20));
    await uploadTrack(scriptB.id, 'b.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const cardA = scriptCard(page, 'Render A');
    const cardB = scriptCard(page, 'Render B');

    // Expand cardA only — accordion allows only one expanded card at a time.
    // cardB stays collapsed; its buttons are in v-show=false but still in the DOM
    // so toHaveCount / toBeDisabled work regardless of visibility.
    await toggleScriptCard(cardA);

    const btnsA = renderButtons(cardA);
    const btnsB = renderButtons(cardB);
    await expect(btnsA).toHaveCount(5);
    await expect(btnsB).toHaveCount(5);

    // Start rendering on script A
    await btnsA.first().click();
    await expect(renderDialog(page)).toBeVisible({ timeout: 5000 });

    // All buttons on BOTH scripts should be disabled
    for (let i = 0; i < 5; i++) {
      await expect(btnsA.nth(i)).toBeDisabled();
      await expect(btnsB.nth(i)).toBeDisabled();
    }
  });

  test('dialog cannot be closed while rendering is in progress', async ({
    page,
  }) => {
    const script = await tracker.createScript('No Close');
    await uploadTrack(script.id, 'noclose.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'No Close');
    await toggleScriptCard(card);
    await renderButtons(card).first().click();

    const dialog = renderDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close button should not exist (closable=false during rendering)
    await expect(dialog.locator('.p-dialog-close-button')).toHaveCount(0);

    // Dialog remains visible
    await expect(dialog).toBeVisible();
  });

  // ─── Multiple Files Queue ──────────────────────────────────────

  test('render dialog shows correct file name when rendering', async ({
    page,
  }) => {
    const script = await tracker.createScript('Multi File Render');
    await uploadTrack(script.id, 'multi1.mp3', generateTestMp3(20));
    await uploadTrack(script.id, 'multi2.mp3', generateTestMp3(20));
    await blockFfmpegLoad(page);

    await page.goto('/scripts');

    const card = scriptCard(page, 'Multi File Render');
    // Expand card to make tracks list and render buttons visible
    await toggleScriptCard(card);
    await expect(card.getByText('multi1.mp3')).toBeVisible();
    await expect(card.getByText('multi2.mp3')).toBeVisible();

    const btns = renderButtons(card);

    // All buttons enabled initially
    const count = await btns.count();
    for (let i = 0; i < count; i++) {
      await expect(btns.nth(i)).toBeEnabled();
    }

    // Click render on first file's first speed
    await btns.first().click();

    const dialog = renderDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('multi1.mp3')).toBeVisible();

    // ALL render buttons disabled during rendering
    for (let i = 0; i < count; i++) {
      await expect(btns.nth(i)).toBeDisabled();
    }
  });

  // ─── Variant Status After Upload ───────────────────────────────

  test('variant status updates correctly after API upload and reload', async ({
    page,
  }) => {
    const script = await tracker.createScript('Render Status');
    const file = await uploadTrack(script.id, 'status.mp3', generateTestMp3(20));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Render Status');
    await expect(readyLabels(card)).toHaveCount(1); // 1.0x
    await expect(renderButtons(card)).toHaveCount(5);

    // Upload 1.1x via API
    await uploadVariant(file.id, 1.1, generateTestMp3(15));
    await page.reload();

    const card2 = scriptCard(page, 'Render Status');
    await expect(readyLabels(card2)).toHaveCount(2);
    await expect(renderButtons(card2)).toHaveCount(4);

    // Upload all remaining
    for (const speed of [1.2, 1.3, 1.4, 1.5]) {
      await uploadVariant(file.id, speed, generateTestMp3(15));
    }
    await page.reload();

    const card3 = scriptCard(page, 'Render Status');
    await expect(readyLabels(card3)).toHaveCount(6);
    await expect(renderButtons(card3)).toHaveCount(0);
  });

  // ─── CORS Regression ───────────────────────────────────────────

  test('cross-origin audio fetch works under COEP', async ({ page }) => {
    const script = await tracker.createScript('CORS Check');
    const file = await uploadTrack(script.id, 'cors.mp3', generateTestMp3(5));
    const original = file.variants.find((v) => v.speed === 1.0);
    expect(original).toBeTruthy();

    await page.goto('/scripts');

    // Perform cross-origin fetch to audio endpoint from browser context
    const result = await page.evaluate(async (variantId: string) => {
      try {
        const apiBase = `${window.location.protocol}//${window.location.hostname}:18181/api`;
        const res = await fetch(`${apiBase}/audio/${variantId}`);
        return {
          ok: res.ok,
          status: res.status,
          contentType: res.headers.get('content-type'),
          cors: res.headers.get('cross-origin-resource-policy'),
          size: (await res.blob()).size,
          error: null,
        };
      } catch (e) {
        return {
          ok: false,
          status: 0,
          contentType: null,
          cors: null,
          size: 0,
          error: (e as Error).message,
        };
      }
    }, original?.id ?? '');

    expect(result.error).toBeNull();
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.size).toBeGreaterThan(0);
    expect(result.contentType).toBe('audio/mpeg');
    // Note: Cross-Origin-Resource-Policy header is set by the API and used by
    // the browser at the network level for COEP, but it is not exposed to JS
    // via fetch() headers (not in CORS safelisted response headers).
    // The fact that the fetch succeeded under COEP proves CORP is working.
  });
});
