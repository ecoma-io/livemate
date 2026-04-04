import { test, expect } from '@playwright/test';
import {
  TestScriptTracker,
  uploadTrack,
  uploadVariant,
  generateTestMp3,
} from '../../helpers/api';
import {
  pageTitle,
  scriptTile,
  stopButton,
  clickStopButton,
  setSpeed,
  speedDisplay,
  countdownBadge,
} from '../../helpers/pages';
import { monitorConsoleErrors } from '../../helpers/monitoring';

test.describe('Player Page', () => {
  const tracker = new TestScriptTracker();

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  // ─── Layout & Navigation ─────────────────────────────────────────

  test('shows Live Studio heading', async ({ page }) => {
    await page.goto('/');
    await expect(pageTitle(page)).toHaveText('Live Studio');
  });

  test('speed slider defaults to 1.0x', async ({ page }) => {
    await page.goto('/');
    await expect(speedDisplay(page)).toContainText('1.0x');

    // The first slider (speed) should have aria-valuenow=10
    const slider = page
      .locator('#topbar-secondary')
      .getByRole('slider')
      .first();
    await expect(slider).toHaveAttribute('aria-valuenow', '10');
  });

  test('volume slider is present', async ({ page }) => {
    await page.goto('/');
    // Second slider in the sub-header is volume
    const volumeSlider = page
      .locator('#topbar-secondary')
      .getByRole('slider')
      .last();
    await expect(volumeSlider).toBeVisible();
  });

  test('stop button is hidden when not playing', async ({ page }) => {
    await page.goto('/');
    // STOP NOW button only appears via Teleport when isPlaying, so it shouldn't exist
    await expect(stopButton(page)).toBeHidden();
  });

  // ─── Speed Control ────────────────────────────────────────────────

  test('can change speed via slider', async ({ page }) => {
    await page.goto('/');

    // Default 1.0x
    await expect(speedDisplay(page)).toContainText('1.0x');

    // Change to 1.2x
    await setSpeed(page, 1.2);
    await expect(speedDisplay(page)).toContainText('1.2x');

    // Change to 1.5x
    await setSpeed(page, 1.5);
    await expect(speedDisplay(page)).toContainText('1.5x');

    // Back to 1.0x
    await setSpeed(page, 1.0);
    await expect(speedDisplay(page)).toContainText('1.0x');
  });

  // ─── Script Tile Display ──────────────────────────────────────────

  test('scripts with matching variants appear as tiles', async ({ page }) => {
    const script = await tracker.createScript('Tile Test', '#3b82f6');
    const mp3 = generateTestMp3(20);
    await uploadTrack(script.id, 'tile.mp3', mp3);

    await page.goto('/');

    // Script should appear as a clickable tile button
    const tile = scriptTile(page, 'Tile Test');
    await expect(tile).toBeVisible();
  });

  test('tile shows correct background color', async ({ page }) => {
    const script = await tracker.createScript('Red Tile', '#ef4444');
    const mp3 = generateTestMp3(20);
    await uploadTrack(script.id, 'red.mp3', mp3);

    await page.goto('/');

    const tile = scriptTile(page, 'Red Tile');
    await expect(tile).toBeVisible();
    await expect(tile).toHaveCSS('background-color', 'rgb(239, 68, 68)');
  });

  test('multiple scripts display as grid', async ({ page }) => {
    const s1 = await tracker.createScript('Grid A', '#22c55e');
    const s2 = await tracker.createScript('Grid B', '#3b82f6');
    const s3 = await tracker.createScript('Grid C', '#f97316');

    const mp3 = generateTestMp3(20);
    await uploadTrack(s1.id, 'a.mp3', mp3);
    await uploadTrack(s2.id, 'b.mp3', mp3);
    await uploadTrack(s3.id, 'c.mp3', mp3);

    await page.goto('/');

    await expect(scriptTile(page, 'Grid A')).toBeVisible();
    await expect(scriptTile(page, 'Grid B')).toBeVisible();
    await expect(scriptTile(page, 'Grid C')).toBeVisible();
  });

  // ─── Speed Filtering ─────────────────────────────────────────────

  test('script with only 1.0x variant hidden at other speeds', async ({
    page,
  }) => {
    const script = await tracker.createScript('Only 1.0x');
    const mp3 = generateTestMp3(20);
    await uploadTrack(script.id, 'only10.mp3', mp3);

    await page.goto('/');

    // Visible at 1.0x
    await expect(scriptTile(page, 'Only 1.0x')).toBeVisible();

    // Hidden at 1.1x
    await setSpeed(page, 1.1);
    await expect(scriptTile(page, 'Only 1.0x')).toBeHidden();

    // Hidden at 1.5x
    await setSpeed(page, 1.5);
    await expect(scriptTile(page, 'Only 1.0x')).toBeHidden();

    // Back to 1.0x - visible again
    await setSpeed(page, 1.0);
    await expect(scriptTile(page, 'Only 1.0x')).toBeVisible();
  });

  test('script with all speed variants visible at every speed', async ({
    page,
  }) => {
    const script = await tracker.createScript('All Speeds', '#8b5cf6');
    const mp3 = generateTestMp3(20);
    const file = await uploadTrack(script.id, 'allspeed.mp3', mp3);
    for (const speed of [1.1, 1.2, 1.3, 1.4, 1.5]) {
      await uploadVariant(file.id, speed, generateTestMp3(15));
    }

    await page.goto('/');

    const tile = scriptTile(page, 'All Speeds');

    // Visible at every speed
    for (const speed of [1.0, 1.1, 1.2, 1.3, 1.4, 1.5]) {
      await setSpeed(page, speed);
      await expect(tile).toBeVisible();
    }
  });

  test('empty state when no scripts match current speed', async ({ page }) => {
    const script = await tracker.createScript('Empty Speed');
    const mp3 = generateTestMp3(20);
    await uploadTrack(script.id, 'empty.mp3', mp3);

    await page.goto('/');

    // Visible at 1.0x
    await expect(scriptTile(page, 'Empty Speed')).toBeVisible();

    // At 1.3x with no variants, this script should be hidden
    await setSpeed(page, 1.3);
    await expect(scriptTile(page, 'Empty Speed')).toBeHidden();
    // Note: "No audio available" message only appears when ALL scripts lack
    // variants for this speed. In a shared DB other scripts may have 1.3x
    // variants, so we only assert our test script is hidden.
  });

  // ─── Playback ────────────────────────────────────────────────────

  test('clicking tile triggers audio request @webkit-incompatible', async ({
    page,
  }) => {
    const scriptName = `Play Click ${Date.now()}`;
    const script = await tracker.createScript(scriptName);
    const mp3 = generateTestMp3(50);
    const file = await uploadTrack(script.id, 'play.mp3', mp3);
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

    const tile = scriptTile(page, scriptName);
    await expect(tile).toBeVisible();

    // Click and wait for audio request
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes(`/api/audio/${variantId}`),
    );
    await tile.click();
    const audioRequest = await requestPromise;

    // Verify correct variant was requested
    expect(audioRequest.url()).toContain(`/api/audio/${variantId}`);
  });

  test('play activates stop button, stop click deactivates it @webkit-incompatible', async ({
    page,
  }) => {
    const script = await tracker.createScript('Stop Lifecycle');
    const mp3 = generateTestMp3(50);
    await uploadTrack(script.id, 'stop.mp3', mp3);

    // Intercept audio to allow playback
    // Use 32KB (~2s) so the stop button stays mounted long enough to click
    await page.route('**/api/audio/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: generateTestMp3(32),
      });
    });

    await page.goto('/');

    // Before play: stop button hidden
    await expect(stopButton(page)).toBeHidden();

    // Wait for tile to be rendered before clicking
    const stopTile = scriptTile(page, 'Stop Lifecycle');
    await expect(stopTile).toBeVisible();

    // Click to play
    await stopTile.click();

    // Stop button should appear
    await expect(stopButton(page)).toBeVisible({ timeout: 5000 });

    // Click stop
    await clickStopButton(page);
  });

  test('clicking tile does not crash the app', async ({ page }) => {
    const script = await tracker.createScript('No Crash');
    const mp3 = generateTestMp3(50);
    await uploadTrack(script.id, 'nocrash.mp3', mp3);

    const consoleErrors = monitorConsoleErrors(page);

    await page.goto('/');

    const tile = scriptTile(page, 'No Crash');
    await expect(tile).toBeVisible();

    // Click should not throw or crash
    await tile.click();

    // Page should remain functional
    await expect(pageTitle(page)).toHaveText('Live Studio');

    // No critical console errors (ignore expected audio errors in headless)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('AudioContext') &&
        !e.includes('NotAllowedError') &&
        !e.includes('decodeAudioData') &&
        !e.includes('Howler') &&
        !e.includes('favicon') &&
        !e.includes('403'),
    );
    expect(criticalErrors).toEqual([]);
  });

  test('speed change during playback shows correct tiles', async ({ page }) => {
    const script = await tracker.createScript('Speed During Play');
    const mp3 = generateTestMp3(50);
    const file = await uploadTrack(script.id, 'speedplay.mp3', mp3);
    await uploadVariant(file.id, 1.2, generateTestMp3(40));

    await page.goto('/');

    // Wait for tile to be rendered before clicking
    const speedTile = scriptTile(page, 'Speed During Play');
    await expect(speedTile).toBeVisible();

    // Click at 1.0x
    await speedTile.click();

    // Switch speed to 1.2x
    await setSpeed(page, 1.2);

    // App should still be functional
    await expect(pageTitle(page)).toHaveText('Live Studio');

    // Tile should still be visible (has 1.2x variant)
    await expect(scriptTile(page, 'Speed During Play')).toBeVisible();
  });

  test('script with multiple files plays random variant @webkit-incompatible', async ({
    page,
  }) => {
    const script = await tracker.createScript('Multi Random');
    const mp3 = generateTestMp3(30);
    const file1 = await uploadTrack(script.id, 'rand-a.mp3', mp3);
    const file2 = await uploadTrack(script.id, 'rand-b.mp3', mp3);

    const validVariantIds = new Set([
      file1.variants[0].id,
      file2.variants[0].id,
    ]);

    const requestedVariantIds: string[] = [];
    await page.route('**/api/audio/**', async (route) => {
      const url = route.request().url();
      const id = url.split('/').pop() ?? '';
      requestedVariantIds.push(id);
      // Use 64KB (~4s) so the stop button stays mounted long enough to click
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: generateTestMp3(64),
      });
    });

    await page.goto('/');

    const tile = scriptTile(page, 'Multi Random');
    await expect(tile).toBeVisible();

    // Play several times to test random selection
    for (let i = 0; i < 6; i++) {
      const reqPromise = page.waitForRequest((req) =>
        req.url().includes('/api/audio/'),
      );
      await tile.click();
      await reqPromise;

      // Stop before next play
      await clickStopButton(page);
    }

    // All requested IDs should be valid
    expect(requestedVariantIds.length).toBe(6);
    for (const id of requestedVariantIds) {
      expect(validVariantIds.has(id)).toBe(true);
    }

    // Both variants should have been played (random selection)
    const uniqueIds = new Set(requestedVariantIds);
    expect(uniqueIds.size).toBe(2);
  });

  // ─── API Data Integrity ──────────────────────────────────────────

  test('API returns correct speed value for uploaded file', async () => {
    const script = await tracker.createScript('API Speed');
    const mp3 = generateTestMp3(20);
    const file = await uploadTrack(script.id, 'speed.mp3', mp3);

    // File should have exactly 1 variant at speed 1.0
    expect(file.variants).toHaveLength(1);
    expect(file.variants[0].speed).toBe(1.0);

    // Verify through GET /scripts endpoint
    const res = await fetch('http://127.0.0.1:18181/api/scripts');
    const allScripts = (await res.json()) as {
      id: string;
      tracks: { variants: { speed: number }[] }[];
    }[];
    const target = allScripts.find((s) => s.id === script.id);
    expect(target).toBeDefined();
    expect(target?.tracks[0].variants[0].speed).toBe(1.0);
  });

  // ─── Countdown Timer ─────────────────────────────────────────────

  test('shows countdown badge on active tile when variant has duration @webkit-incompatible', async ({
    page,
  }) => {
    const scriptName = `CDown ${Date.now()}`;
    const script = await tracker.createScript(scriptName);
    const mp3 = generateTestMp3(50);
    // Pass explicit duration so the variant.duration field is non-null
    await uploadTrack(script.id, 'countdown.mp3', mp3, 'audio/mpeg', 30);

    // Serve a long audio file so playback stays active
    await page.route('**/api/audio/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: generateTestMp3(64),
      });
    });

    await page.goto('/');

    const tile = scriptTile(page, scriptName);
    await expect(tile).toBeVisible();

    await tile.click();

    // Countdown badge should appear (variant has duration from API)
    const badge = countdownBadge(page, scriptName);
    await expect(badge).toBeVisible({ timeout: 5000 });

    // Badge text should match MM:SS format
    const badgeText = await badge.textContent();
    expect(badgeText?.trim()).toMatch(/^\d+:\d{2}$/);

    await clickStopButton(page);
  });

  test('countdown badge disappears after stop @webkit-incompatible', async ({
    page,
  }) => {
    const scriptName = `CDownStop ${Date.now()}`;
    const script = await tracker.createScript(scriptName);
    const mp3 = generateTestMp3(50);
    // Pass explicit duration so the variant.duration field is non-null
    await uploadTrack(script.id, 'cstop.mp3', mp3, 'audio/mpeg', 30);

    await page.route('**/api/audio/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: generateTestMp3(64),
      });
    });

    await page.goto('/');

    const tile = scriptTile(page, scriptName);
    await expect(tile).toBeVisible();

    await tile.click();

    // Countdown visible while playing
    const badge = countdownBadge(page, scriptName);
    await expect(badge).toBeVisible({ timeout: 5000 });

    // Stop playback
    await clickStopButton(page);

    // Countdown badge should be gone (tile is no longer active)
    await expect(badge).toBeHidden({ timeout: 3000 });
  });
});
