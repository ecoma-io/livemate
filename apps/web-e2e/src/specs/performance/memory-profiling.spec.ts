import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  TestScriptTracker,
  uploadTrack,
  uploadVariant,
  generateTestMp3,
} from '../../helpers/api';
import { scriptTile } from '../../helpers/pages';

function getAudioMimeType(fileName: string): string {
  if (fileName.endsWith('.wav')) return 'audio/wav';
  if (fileName.endsWith('.m4a')) return 'audio/mp4';
  return 'audio/mpeg';
}

test.describe('Memory Profiling & OOM Prevention @chromium-only', () => {
  const tracker = new TestScriptTracker();

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('playback loop does not leak memory over time', async ({ page }) => {
    test.setTimeout(120_000); // 100 clicks × 150ms + GC + network overhead
    // 1. Setup a script with multiple heavy test audio files (from fixtures)
    const testScript = await tracker.createScript(
      'Memory Test Script',
      '#4287f5',
    );

    const fixturesDir = path.join(__dirname, '..', '..', 'fixtures', 'audio');
    const files = fs
      .readdirSync(fixturesDir)
      .filter(
        (f: string) =>
          f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.m4a'),
      );

    // Upload each file to the script
    for (const fileName of files) {
      const buffer = fs.readFileSync(path.join(fixturesDir, fileName));
      const mimeType = getAudioMimeType(fileName);

      const track = await uploadTrack(
        testScript.id,
        fileName,
        buffer,
        mimeType,
      );

      // Simulate rendered variants at all RENDER_SPEEDS (1.1–1.5)
      const variantBuffer = generateTestMp3(500);
      for (const speed of [1.1, 1.2, 1.3, 1.4, 1.5]) {
        await uploadVariant(track.id, speed, variantBuffer);
      }
    }

    // 2. Navigate to Live Studio page
    await page.goto('/');

    // 3. Connect to Chrome DevTools Protocol to measure memory
    const client = await page.context().newCDPSession(page);

    // 4. Perform intensive playback loop
    const tile = scriptTile(page, 'Memory Test Script').first();
    // Wait for all scripts to be visible before measuring baseline memory
    await expect(tile).toBeVisible();

    // Garbage collect and measure baseline memory
    await client.send('HeapProfiler.collectGarbage');
    let metrics = await client.send('Runtime.getHeapUsage');
    const initialMemory = metrics.usedSize;

    for (let i = 0; i < 100; i++) {
      await tile.click();
      // Pause to let Howler fetch/decode -> replace -> unload previous audio
      await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 150)));
    }

    // Pause to ensure the final unload triggers properly
    await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 1000)));

    // 5. Measure final memory after garbage collection (multiple passes for reliability)
    for (let gc = 0; gc < 3; gc++) {
      await client.send('HeapProfiler.collectGarbage');
    }
    // Wait for finalizers to complete
    await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 500)));
    metrics = await client.send('Runtime.getHeapUsage');
    const finalMemory = metrics.usedSize;

    // 6. Calculate difference and assert
    const diffBytes = finalMemory - initialMemory;
    const diffMb = diffBytes / (1024 * 1024);

    console.log(
      `Memory Difference after 100 playbacks: ${diffMb.toFixed(2)} MB`,
    );

    // A leak would result in significant growth (megabytes per instance).
    // Allowing 5MB as a generous margin for typical runtime/JIT caching overhead.
    expect(diffMb).toBeLessThan(5);
  });
});
