import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestScriptTracker, uploadTrack } from '../../helpers/api';
import { scriptTile, stopButton } from '../../helpers/pages';

// Load real MP3 fixtures
const FIXTURE_DIR = join(__dirname, '..', '..', 'fixtures', 'audio');
const audio1Buffer = readFileSync(join(FIXTURE_DIR, 'audio1.mp3'));
const audio2Buffer = readFileSync(join(FIXTURE_DIR, 'audio2.mp3'));

test.describe('Playback Verification with Real Audio @webkit-incompatible', () => {
  const tracker = new TestScriptTracker();

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('real audio request succeeds at 1.0x with correct headers', async ({
    page,
  }) => {
    const script = await tracker.createScript('Real Audio Test', '#22c55e');
    const file = await uploadTrack(script.id, 'audio1.mp3', audio1Buffer);

    expect(file.variants).toHaveLength(1);
    expect(file.variants[0].speed).toBe(1.0);

    const variantId = file.variants[0].id;

    // Collect console errors and network failures
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number; statusText: string }[] =
      [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (response) => {
      if (response.url().includes('/api/audio/') && !response.ok()) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    await page.goto('/');

    const tile = scriptTile(page, 'Real Audio Test');
    await expect(tile).toBeVisible();

    // Wait for audio response after clicking
    const responsePromise = page.waitForResponse((res) =>
      res.url().includes('/api/audio/'),
    );

    await tile.click();

    const audioResponse = await responsePromise;

    // Verify: audio request succeeded
    expect(audioResponse.status()).toBe(200);
    expect(audioResponse.url()).toContain(`/api/audio/${variantId}`);
    expect(audioResponse.headers()['content-type']).toBe('audio/mpeg');

    // Verify: CORS headers present
    expect(audioResponse.headers()['cross-origin-resource-policy']).toBe(
      'cross-origin',
    );

    // Verify: no audio-related console errors
    const audioErrors = consoleErrors.filter(
      (e) =>
        e.includes('audio') ||
        e.includes('Audio') ||
        e.includes('CORS') ||
        e.includes('Howl'),
    );
    expect(audioErrors).toEqual([]);

    // Verify: no network failures
    expect(networkErrors).toEqual([]);

    // Verify: stop button appeared (playback started)
    await expect(stopButton(page)).toBeVisible({ timeout: 5000 });
  });

  test('Web Audio API actually decodes real audio', async ({ page }) => {
    const script = await tracker.createScript('AudioContext Test', '#3b82f6');
    const file = await uploadTrack(script.id, 'audio1.mp3', audio1Buffer);
    expect(file.variants[0].speed).toBe(1.0);

    await page.goto('/');

    const tile = scriptTile(page, 'AudioContext Test');
    await expect(tile).toBeVisible();

    // Inject hook to detect actual audio decoding via AudioContext.decodeAudioData
    await page.evaluate(() => {
      (window as any).__audioPlaybackDetected = false;
      (window as any).__audioErrors = [];

      const origDecodeAudioData = AudioContext.prototype.decodeAudioData;
      AudioContext.prototype.decodeAudioData = function (
        this: AudioContext,
        ...args: [ArrayBuffer, DecodeSuccessCallback?, DecodeErrorCallback?]
      ) {
        return origDecodeAudioData
          .apply(this, args)
          .then((buffer: AudioBuffer) => {
            if (buffer && buffer.duration > 0) {
              (window as any).__audioPlaybackDetected = true;
              (window as any).__audioDecodedDuration = buffer.duration;
              (window as any).__audioSampleRate = buffer.sampleRate;
            }
            return buffer;
          })
          .catch((err: Error) => {
            (window as any).__audioErrors.push(err.message);
            throw err;
          });
      };
    });

    // Wait for audio response
    const responsePromise = page.waitForResponse((res) =>
      res.url().includes('/api/audio/'),
    );

    await tile.click();
    await responsePromise;

    // Wait for audio decoding to complete
    await page.waitForFunction(
      () =>
        (window as any).__audioPlaybackDetected === true ||
        (window as any).__audioErrors.length > 0,
      { timeout: 10000 },
    );

    // Check results
    const result = await page.evaluate(() => ({
      detected: (window as any).__audioPlaybackDetected,
      errors: (window as any).__audioErrors,
      duration: (window as any).__audioDecodedDuration,
      sampleRate: (window as any).__audioSampleRate,
    }));

    // Verify actual audio was decoded successfully
    expect(result.errors).toEqual([]);
    expect(result.detected).toBe(true);
    expect(result.duration).toBeGreaterThan(0);
  });

  test('full play-stop lifecycle with real audio', async ({ page }) => {
    const script = await tracker.createScript('Lifecycle Test', '#ef4444');
    const file = await uploadTrack(script.id, 'audio2.mp3', audio2Buffer);
    expect(file.variants[0].speed).toBe(1.0);

    // Collect warnings (Howler warns "No file extension" when format is missing)
    const consoleWarnings: string[] = [];
    const audioResponses: {
      url: string;
      status: number;
      headers: Record<string, string>;
    }[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    page.on('response', async (response) => {
      if (response.url().includes('/api/audio/')) {
        audioResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
        });
      }
    });

    await page.goto('/');

    // Step 1: Tile is visible at 1.0x
    const tile = scriptTile(page, 'Lifecycle Test');
    await expect(tile).toBeVisible();

    // Step 2: Click to play
    await tile.click();

    // Step 3: Stop button activates (isPlaying = true)
    await expect(stopButton(page)).toBeVisible({ timeout: 5000 });

    // Step 4: No "No file extension" warning from Howler
    const formatWarnings = consoleWarnings.filter((w) =>
      w.includes('No file extension'),
    );
    expect(formatWarnings).toEqual([]);

    // Step 5: Click stop
    await stopButton(page).click();
    await expect(stopButton(page)).toBeHidden({ timeout: 3000 });

    // Step 6: Verify audio request was made and succeeded
    expect(audioResponses.length).toBeGreaterThan(0);
    expect(audioResponses[0].status).toBe(200);
    expect(audioResponses[0].headers['cross-origin-resource-policy']).toBe(
      'cross-origin',
    );
  });

  test('random variant selection with two real audio files', async ({
    page,
  }) => {
    const script = await tracker.createScript('Two Files Test', '#8b5cf6');
    const file1 = await uploadTrack(script.id, 'audio1.mp3', audio1Buffer);
    const file2 = await uploadTrack(script.id, 'audio2.mp3', audio2Buffer);

    const validIds = new Set([
      file1.variants[0].id,
      file2.variants[0].id,
    ]);

    // Track audio requests
    const requestedIds: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/audio/') && response.ok()) {
        const id = response.url().split('/').pop() ?? '';
        requestedIds.push(id);
      }
    });

    await page.goto('/');

    const tile = scriptTile(page, 'Two Files Test');
    await expect(tile).toBeVisible();

    // Play several times
    for (let i = 0; i < 6; i++) {
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes('/api/audio/') && res.ok(),
      );

      await tile.click();
      await responsePromise;

      // Wait for playback to end (click stop if visible, or let it finish naturally)
      const stop = stopButton(page);
      const isStopVisible = await stop.isVisible().catch(() => false);
      if (isStopVisible) {
        await stop.click({ timeout: 2000 }).catch(() => {
          // Audio finished naturally between visibility check and click
        });
      }
      await expect(stop).toBeHidden({ timeout: 5000 });
    }

    // Verify: all requested are valid variant IDs
    expect(requestedIds.length).toBe(6);
    for (const id of requestedIds) {
      expect(validIds.has(id)).toBe(true);
    }

    // Verify: both variants were played (random selection works)
    const uniqueIds = new Set(requestedIds);
    expect(uniqueIds.size).toBe(2);
  });
});
