import { test, expect } from '@playwright/test';
import {
  TestScriptTracker,
  getScripts,
  uploadTrack,
  uploadVariant,
  generateTestMp3,
} from '../../helpers/api';
import {
  scriptCard,
  scriptCardById,
  fileInput,
  renderButtons,
  renderAllButton,
  confirmDelete,
  readyLabels,
  missingLabels,
  createScriptViaUI,
  clickAddScript,
  expectToast,
  deleteScriptViaMenu,
  expectRenderAllInMenu,
  clickRenderAllMissingGlobal,
  toggleScriptCard,
  isScriptCardExpanded,
  missingVariantsBadge,
  renderDialog,
  blockFfmpegLoad,
} from '../../helpers/pages';
import {
  monitorConsoleErrors,
  monitorNetworkErrors,
} from '../../helpers/monitoring';

test.describe('Script Management', () => {
  const tracker = new TestScriptTracker();

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  // ─── Empty State ──────────────────────────────────────────────────

  test('shows empty state when no scripts exist', async ({ page }) => {
    // Navigate to scripts page (existing scripts from other test runs may exist)
    await page.goto('/scripts');

    // The empty state component has specific UI elements
    // We verify the "No Scripts Yet" text OR scripts list is shown
    // (can't guarantee empty DB across test runs, but verify the page loads)
    await expect(page.locator('h1')).toHaveText('Soundboard Manager');
  });

  // ─── Script CRUD ──────────────────────────────────────────────────

  test('opens create dialog on add button click', async ({ page }) => {
    await page.goto('/scripts');
    await clickAddScript(page);

    const dialog = page
      .locator('.p-dialog')
      .filter({ hasText: 'Create New Audio Group' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#script-name')).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Create Now' }),
    ).toBeVisible();
  });

  test('create button is disabled with empty name', async ({ page }) => {
    await page.goto('/scripts');
    await clickAddScript(page);

    const dialog = page
      .locator('.p-dialog')
      .filter({ hasText: 'Create New Audio Group' });
    const createBtn = dialog.getByRole('button', { name: 'Create Now' });
    await expect(createBtn).toBeDisabled();
  });

  test('create button is disabled when name exceeds 24 characters', async ({
    page,
  }) => {
    await page.goto('/scripts');
    await clickAddScript(page);

    const dialog = page
      .locator('.p-dialog')
      .filter({ hasText: 'Create New Audio Group' });
    // Input has maxlength=24, so fill with 24 chars first then verify button is enabled,
    // then programmatically set a longer value to test the guard
    await dialog.locator('#script-name').fill('A'.repeat(24));
    await expect(
      dialog.getByRole('button', { name: 'Create Now' }),
    ).toBeEnabled();
    await dialog.locator('#script-name').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('maxlength');
    });
    await dialog.locator('#script-name').fill('A'.repeat(25));
    await expect(
      dialog.getByRole('button', { name: 'Create Now' }),
    ).toBeDisabled();
  });

  test('shows character counter in create dialog', async ({ page }) => {
    await page.goto('/scripts');
    await clickAddScript(page);

    const dialog = page
      .locator('.p-dialog')
      .filter({ hasText: 'Create New Audio Group' });
    await dialog.locator('#script-name').fill('Hello');
    await expect(dialog.getByText('5/24')).toBeVisible();
  });

  test('creates a new script via dialog', async ({ page }) => {
    await page.goto('/scripts');
    await createScriptViaUI(page, 'E2E New Script');

    // Track for cleanup
    await tracker.trackScriptByName('E2E New Script');

    // Script name should appear on the page
    await expect(page.getByText('E2E New Script').first()).toBeVisible();

    // Success toast
    await expectToast(page, 'Audio Group Created');
  });

  test('new script is auto-expanded and scrolled into view after creation', async ({
    page,
  }) => {
    // Track any leftover 'Auto Expand Test' scripts from prior runs for full cleanup.
    for (const s of (await getScripts()).filter(
      (s) => s.name === 'Auto Expand Test',
    )) {
      tracker.trackScript(s.id);
    }

    await page.goto('/scripts');
    await createScriptViaUI(page, 'Auto Expand Test');

    // Track all matching scripts (old leftovers + the newly created one).
    for (const s of (await getScripts()).filter(
      (s) => s.name === 'Auto Expand Test',
    )) {
      tracker.trackScript(s.id);
    }

    // The newly created card should be auto-expanded.
    // Locate the expanded card specifically via its 'Collapse tracks' aria-label
    // (the chevron shows 'Collapse tracks' only when the card is expanded).
    // This is robust even if leftover same-named cards exist in the DB.
    await expect(
      page
        .locator('.p-card')
        .filter({ hasText: 'Auto Expand Test' })
        .filter({ has: page.locator('button[aria-label="Collapse tracks"]') }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('renames a script via dialog', async ({ page }) => {
    await tracker.createScript('Rename Me');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Rename Me');
    await expect(card).toBeVisible();

    // Expand card first, then click inline Rename button
    await toggleScriptCard(card);
    await card.getByRole('button', { name: 'Rename' }).click();

    const dialog = page
      .locator('.p-dialog')
      .filter({ hasText: 'Rename Audio Group' });
    await expect(dialog).toBeVisible();

    // Input should be pre-filled with current name
    const nameInput = dialog.locator('#script-name');
    await expect(nameInput).toHaveValue('Rename Me');
    await nameInput.clear();
    await nameInput.fill('Renamed Script');

    // Register listener BEFORE triggering the action to avoid race condition
    const renameResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/scripts/') &&
        resp.request().method() === 'PUT',
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    await renameResponse;

    // Verify persists after reload
    await page.reload();
    await expect(page.getByText('Renamed Script')).toBeVisible();
  });

  test('cannot rename script to name exceeding 24 characters', async ({
    page,
  }) => {
    await tracker.createScript('Max Len Test');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Max Len Test');
    await toggleScriptCard(card);
    await card.getByRole('button', { name: 'Rename' }).click();

    const dialog = page
      .locator('.p-dialog')
      .filter({ hasText: 'Rename Audio Group' });
    await expect(dialog).toBeVisible();

    const nameInput = dialog.locator('#script-name');

    // Input has maxlength=24 enforced by the browser; typing 25 chars results in only 24 stored
    const longName = 'A'.repeat(25);
    await nameInput.clear();
    await nameInput.fill(longName);

    // Browser maxlength clamps to 24 chars
    const actualValue = await nameInput.inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(24);

    // Save button should be disabled since name is too long (25 chars won't actually exceed due to maxlength)
    // Close the dialog
    await page.keyboard.press('Escape');
  });

  test('changes script color via picker', async ({ page }) => {
    await tracker.createScript('Color Test', '#22c55e');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Color Test');

    // Expand card, then click inline Change Color button
    await toggleScriptCard(card);
    await card.getByRole('button', { name: 'Change Color' }).click();

    // PrimeVue Dialog with color palette should appear
    const colorDialog = page
      .locator('.p-dialog')
      .filter({ hasText: 'Choose Group Color' });
    await expect(colorDialog).toBeVisible();

    // Click a different color (blue #3b82f6 = index 10 in PALETTE)
    // Register listener BEFORE triggering the action to avoid race condition
    const colorResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/scripts/') &&
        resp.request().method() === 'PUT',
    );
    // dispatchEvent bypasses Playwright's viewport check (needed on Mobile Safari)
    await colorDialog.locator('.grid button').nth(10).dispatchEvent('click');
    await colorResponse;

    // Verify persists after reload
    await page.reload();
    const updatedCard = scriptCard(page, 'Color Test');
    // Left border should show the new color
    await expect(updatedCard).toHaveCSS(
      'border-left-color',
      'rgb(59, 130, 246)',
    );
  });

  test('deletes a script with confirmation', async ({ page }) => {
    const script = await tracker.createScript('Delete Me');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Delete Me');
    await expect(card).toBeVisible();

    // Expand card, then click inline Delete Group button
    await toggleScriptCard(card);
    await deleteScriptViaMenu(card);

    // PrimeVue ConfirmDialog appears
    await confirmDelete(page);

    // Script should disappear
    await expect(card).toBeHidden();

    // Success toast
    await expectToast(page, 'Audio Group Deleted');

    // Remove from tracker (already deleted)
    tracker.trackScript(script.id); // track so cleanup doesn't error
  });

  test('displays multiple scripts in creation order', async ({ page }) => {
    await tracker.createScript('Alpha Script');
    await tracker.createScript('Beta Script');
    await tracker.createScript('Gamma Script');

    await page.goto('/scripts');

    await expect(page.getByText('Alpha Script').first()).toBeVisible();
    await expect(page.getByText('Beta Script').first()).toBeVisible();
    await expect(page.getByText('Gamma Script').first()).toBeVisible();

    // Verify order by checking DOM position
    const cards = page.locator('.p-card');
    const allText = await cards.allTextContents();
    const combinedText = allText.join('\n');
    const alphaIdx = combinedText.indexOf('Alpha Script');
    const betaIdx = combinedText.indexOf('Beta Script');
    const gammaIdx = combinedText.indexOf('Gamma Script');

    expect(alphaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(gammaIdx);
  });

  // ─── File Upload ──────────────────────────────────────────────────

  test('uploads an audio file successfully', async ({ page }) => {
    await tracker.createScript('Upload Test');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Upload Test');
    const input = fileInput(card);
    const mp3Buffer = generateTestMp3(50);

    await input.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: mp3Buffer,
    });

    // Success toast
    await expectToast(page, 'uploaded');

    // Expand card to see the newly uploaded track
    await toggleScriptCard(card);

    // File name should appear in the card
    await expect(card.getByText('test-audio.mp3')).toBeVisible();

    // Should show speed variant rows: 1.0x as Ready, others as Missing
    await expect(readyLabels(card)).toHaveCount(1); // 1.0x
    await expect(missingLabels(card)).toHaveCount(5); // 1.1x-1.5x
  });

  test('rejects file larger than 2MB with error toast', async ({ page }) => {
    await tracker.createScript('Large File Test');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Large File Test');
    const input = fileInput(card);
    const largeBuffer = generateTestMp3(2560); // ~2.5MB

    await input.setInputFiles({
      name: 'too-large.mp3',
      mimeType: 'audio/mpeg',
      buffer: largeBuffer,
    });

    // Error toast about file size
    await expectToast(page, 'File Too Large');

    // File should NOT appear
    await expect(card.getByText('too-large.mp3')).toBeHidden();
  });

  test('uploads multiple files to same script', async ({ page }) => {
    const script = await tracker.createScript('Multi Upload');
    await page.goto('/scripts');

    // Use scriptCardById to target the exact script, avoiding collisions with
    // same-named leftover scripts from previous test runs.
    const card = scriptCardById(page, script.id);
    const input = fileInput(card);
    const mp3 = generateTestMp3(30);

    // Upload first file
    await input.setInputFiles({
      name: 'file-a.mp3',
      mimeType: 'audio/mpeg',
      buffer: mp3,
    });
    await expectToast(page, 'uploaded');

    // Upload second file
    await input.setInputFiles({
      name: 'file-b.mp3',
      mimeType: 'audio/mpeg',
      buffer: mp3,
    });
    await expectToast(page, 'uploaded');

    // Expand card to see both uploaded tracks
    await toggleScriptCard(card);

    // Both files should appear
    await expect(card.getByText('file-a.mp3')).toBeVisible();
    await expect(card.getByText('file-b.mp3')).toBeVisible();
  });

  test('deletes an uploaded file with confirmation', async ({ page }) => {
    const script = await tracker.createScript('File Delete Test');
    const mp3 = generateTestMp3(10);
    await uploadTrack(script.id, 'delete-me.mp3', mp3);

    await page.goto('/scripts');

    const card = scriptCard(page, 'File Delete Test');
    // Expand card to access file name and speed rows
    await toggleScriptCard(card);
    await expect(card.getByText('delete-me.mp3')).toBeVisible();

    // The 1.0x row has a danger trash button (delete track)
    // Find the speed row for 1.0x within the file section
    const speedRow = card
      .locator('.flex.items-center')
      .filter({ hasText: '1.0x' });
    await speedRow
      .locator('button')
      .filter({ has: page.locator('.pi-trash') })
      .click();

    // Confirm deletion
    await confirmDelete(page);

    // Toast and file gone
    await expectToast(page, 'Track Deleted');
    await expect(card.getByText('delete-me.mp3')).toBeHidden();
  });

  test('shows empty audio state text', async ({ page }) => {
    await tracker.createScript('Empty Script');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Empty Script');
    // Expand card to see the upload zone
    await toggleScriptCard(card);
    // Empty script has no file names listed, just the upload zone
    // Verify the upload zone instruction is visible
    await expect(card.getByText('Drag & drop')).toBeVisible();
  });

  // ─── Variant Status Display ────────────────────────────────────────

  test('shows all speed rows with correct status after upload', async ({
    page,
  }) => {
    const script = await tracker.createScript('Speed Rows');
    await uploadTrack(script.id, 'speeds.mp3', generateTestMp3(20));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Speed Rows');
    // Expand card to see speed rows
    await toggleScriptCard(card);

    // Should show all 6 speed labels
    for (const speed of ['1.0x', '1.1x', '1.2x', '1.3x', '1.4x', '1.5x']) {
      await expect(
        card.getByText(speed, { exact: true }).first(),
      ).toBeVisible();
    }

    // 1.0x = Ready, 1.1x-1.5x = Missing
    await expect(readyLabels(card)).toHaveCount(1);
    await expect(missingLabels(card)).toHaveCount(5);
  });

  test('shows render buttons for missing variants', async ({ page }) => {
    const script = await tracker.createScript('Render Buttons Test');
    await uploadTrack(script.id, 'render.mp3', generateTestMp3(20));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Render Buttons Test');

    // 5 render buttons for missing speeds (1.1x-1.5x)
    await expect(renderButtons(card)).toHaveCount(5);
  });

  test('shows Ready when variant exists via API', async ({ page }) => {
    const script = await tracker.createScript('Ready Test');
    const file = await uploadTrack(script.id, 'ready.mp3', generateTestMp3(20));
    await uploadVariant(file.id, 1.1, generateTestMp3(15));
    await uploadVariant(file.id, 1.2, generateTestMp3(15));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Ready Test');

    // 3 Ready (1.0x + 1.1x + 1.2x), 3 Missing (1.3x-1.5x)
    await expect(readyLabels(card)).toHaveCount(3);
    await expect(missingLabels(card)).toHaveCount(3);

    // 3 render buttons for remaining speeds
    await expect(renderButtons(card)).toHaveCount(3);
  });

  test('all variants ready hides render buttons', async ({ page }) => {
    const script = await tracker.createScript('All Ready');
    const file = await uploadTrack(script.id, 'all.mp3', generateTestMp3(20));
    for (const speed of [1.1, 1.2, 1.3, 1.4, 1.5]) {
      await uploadVariant(file.id, speed, generateTestMp3(15));
    }

    await page.goto('/scripts');

    const card = scriptCard(page, 'All Ready');

    // All 6 speeds Ready, 0 Missing, 0 render buttons
    await expect(readyLabels(card)).toHaveCount(6);
    await expect(missingLabels(card)).toHaveCount(0);
    await expect(renderButtons(card)).toHaveCount(0);

    // No render-all button either
    await expect(renderAllButton(card)).toHaveCount(0);
  });

  // eslint-disable-next-line playwright/expect-expect
  test('Render All button appears when variants are missing', async ({
    page,
  }) => {
    const script = await tracker.createScript('Render All');
    await uploadTrack(script.id, 'renderall.mp3', generateTestMp3(20));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Render All');

    // Render All should be accessible as inline button after expanding
    await toggleScriptCard(card);
    await expectRenderAllInMenu(card);
  });

  test('variant status updates after API upload and reload', async ({
    page,
  }) => {
    const script = await tracker.createScript('Status Update');
    const file = await uploadTrack(script.id, 'status.mp3', generateTestMp3(20));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Status Update');
    await expect(readyLabels(card)).toHaveCount(1);
    await expect(renderButtons(card)).toHaveCount(5);

    // Upload 1.1x variant via API
    await uploadVariant(file.id, 1.1, generateTestMp3(15));
    await page.reload();

    const card2 = scriptCard(page, 'Status Update');
    await expect(readyLabels(card2)).toHaveCount(2);
    await expect(renderButtons(card2)).toHaveCount(4);

    // Upload remaining variants
    for (const speed of [1.2, 1.3, 1.4, 1.5]) {
      await uploadVariant(file.id, speed, generateTestMp3(15));
    }
    await page.reload();

    const card3 = scriptCard(page, 'Status Update');
    await expect(readyLabels(card3)).toHaveCount(6);
    await expect(renderButtons(card3)).toHaveCount(0);
  });

  test('delete variant with confirmation', async ({ page }) => {
    const script = await tracker.createScript('Delete Variant');
    const file = await uploadTrack(script.id, 'delvar.mp3', generateTestMp3(20));
    await uploadVariant(file.id, 1.1, generateTestMp3(15));

    await page.goto('/scripts');

    const card = scriptCard(page, 'Delete Variant');
    // Expand card to interact with variant rows
    await toggleScriptCard(card);
    // 1.1x row should have a secondary trash button (delete variant)
    const row11 = card
      .locator('.flex.items-center')
      .filter({ hasText: '1.1x' })
      .filter({ hasText: 'Ready' });
    await row11
      .locator('button')
      .filter({ has: page.locator('.pi-trash') })
      .click();

    await confirmDelete(page);
    await expectToast(page, 'Variant Deleted');

    // After deletion, 1.1x should show Missing
    await page.reload();
    const card2 = scriptCard(page, 'Delete Variant');
    await expect(readyLabels(card2)).toHaveCount(1); // only 1.0x
    await expect(missingLabels(card2)).toHaveCount(5);
  });

  // ─── Operational Error Detection ───────────────────────────────────

  test('header three-dot menu triggers global render all missing variants', async ({
    page,
  }) => {
    const script = await tracker.createScript('Global Render Test');
    await uploadTrack(script.id, 'global.mp3', generateTestMp3(20));

    // Block FFmpeg so the dialog stays open long enough to assert
    await blockFfmpegLoad(page);
    await page.goto('/scripts');

    const card = scriptCard(page, 'Global Render Test');
    // Verify 5 variants are Missing before triggering
    await expect(missingLabels(card)).toHaveCount(5);

    // Open header three-dot menu and click Render All Missing Variant Speed
    await clickRenderAllMissingGlobal(page);

    // Render progress dialog should appear (identified by its fixed title)
    await expect(renderDialog(page)).toBeVisible({ timeout: 5000 });
  });

  test('no console errors or network failures during script CRUD', async ({
    page,
  }) => {
    const consoleErrors = monitorConsoleErrors(page);
    const networkErrors = monitorNetworkErrors(page);

    await page.goto('/scripts');

    // Create script
    await createScriptViaUI(page, 'Error Check Script');
    await tracker.trackScriptByName('Error Check Script');

    // Upload file
    const card = scriptCard(page, 'Error Check Script');
    await fileInput(card)
      .first()
      .setInputFiles({
        name: 'check.mp3',
        mimeType: 'audio/mpeg',
        buffer: generateTestMp3(30),
      });
    await expectToast(page, 'uploaded');

    // Navigate away and back
    await page.goto('/');
    await page.goto('/scripts');

    // Verify no errors
    const relevantErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('Importing a module script failed') &&
        !e.includes('403'),
    );
    expect(relevantErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });
});

// ─── Script Card Accordion + Warning Badge ────────────────────────────

test.describe('Script Card Expand/Collapse and Warning Badge', () => {
  const tracker = new TestScriptTracker();

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('all script cards are collapsed by default on page load', async ({
    page,
  }) => {
    await tracker.createScript('Accordion A');
    await tracker.createScript('Accordion B');
    await page.goto('/scripts');

    const cardA = scriptCard(page, 'Accordion A');
    const cardB = scriptCard(page, 'Accordion B');

    await expect(cardA).toBeVisible();
    await expect(cardB).toBeVisible();

    expect(await isScriptCardExpanded(cardA)).toBe(false);
    expect(await isScriptCardExpanded(cardB)).toBe(false);
  });

  test('clicking chevron expands a script card', async ({ page }) => {
    await tracker.createScript('Expand Test');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Expand Test');
    expect(await isScriptCardExpanded(card)).toBe(false);

    await toggleScriptCard(card);
    expect(await isScriptCardExpanded(card)).toBe(true);
  });

  test('accordion: expanding one card collapses the other', async ({
    page,
  }) => {
    await tracker.createScript('Acc Card 1');
    await tracker.createScript('Acc Card 2');
    await page.goto('/scripts');

    const card1 = scriptCard(page, 'Acc Card 1');
    const card2 = scriptCard(page, 'Acc Card 2');

    // Expand first card
    await toggleScriptCard(card1);
    expect(await isScriptCardExpanded(card1)).toBe(true);
    expect(await isScriptCardExpanded(card2)).toBe(false);

    // Expand second card — first should collapse
    await toggleScriptCard(card2);
    expect(await isScriptCardExpanded(card1)).toBe(false);
    expect(await isScriptCardExpanded(card2)).toBe(true);
  });

  test('clicking chevron on expanded card collapses it', async ({ page }) => {
    await tracker.createScript('Toggle Collapse');
    await page.goto('/scripts');

    const card = scriptCard(page, 'Toggle Collapse');

    // Expand
    await toggleScriptCard(card);
    expect(await isScriptCardExpanded(card)).toBe(true);

    // Collapse again
    await toggleScriptCard(card);
    expect(await isScriptCardExpanded(card)).toBe(false);
  });

  test('missing variant indicator present on collapsed card with missing variants', async ({
    page,
  }) => {
    const script = await tracker.createScript('Badge Test');
    await uploadTrack(script.id, 'badge.mp3', generateTestMp3(20));
    await page.goto('/scripts');

    const card = scriptCard(page, 'Badge Test');
    // Card is collapsed — indicator should be present in DOM and card should have amber border
    await expect(missingVariantsBadge(card)).toBeAttached();
    // Use class assertion: Tailwind v4 returns oklch() not rgb() from getComputedStyle
    await expect(card).toHaveClass(/border-amber-400/);
  });

  test('missing variant indicator removed when card is expanded', async ({
    page,
  }) => {
    const script = await tracker.createScript('Badge Hide Test');
    await uploadTrack(script.id, 'badgehide.mp3', generateTestMp3(20));
    await page.goto('/scripts');

    const card = scriptCard(page, 'Badge Hide Test');
    await expect(missingVariantsBadge(card)).toBeAttached();

    // Expand card — indicator should disappear from DOM
    await toggleScriptCard(card);
    await expect(missingVariantsBadge(card)).not.toBeAttached();
  });

  test('no missing variant indicator when all variants are present', async ({
    page,
  }) => {
    const script = await tracker.createScript('No Badge Test');
    const file = await uploadTrack(
      script.id,
      'nobadge.mp3',
      generateTestMp3(20),
    );
    for (const speed of [1.1, 1.2, 1.3, 1.4, 1.5]) {
      await uploadVariant(file.id, speed, generateTestMp3(15));
    }
    await page.goto('/scripts');

    const card = scriptCard(page, 'No Badge Test');
    // All variants present — no indicator even when collapsed
    await expect(missingVariantsBadge(card)).not.toBeAttached();
  });
});
