/**
 * Page interaction helpers for E2E tests.
 * Provides reusable selectors and actions matching the actual UI components.
 *
 * Routes:   / (Live Studio)   /scripts (Soundboard Manager)
 * UI Framework: PrimeVue 4 + TailwindCSS
 * Speed Control: PrimeVue Slider (values 10–15 = 1.0x–1.5x)
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// ─── Navigation ──────────────────────────────────────────────────────

/** Get sidebar nav button by visible label */
export function navButton(
  page: Page,
  label: 'Live Studio' | 'Soundboard' | 'Account',
): Locator {
  return page.locator('aside button').filter({ hasText: label });
}

/** Navigate to a page via sidebar click (opens mobile drawer if needed) */
export async function navigateTo(
  page: Page,
  label: 'Live Studio' | 'Soundboard' | 'Account',
) {
  const sidebar = page.locator('aside');
  // On mobile, the sidebar is fixed and translated off-screen.
  const isMobileHidden = await sidebar.evaluate((el) => {
    const style = getComputedStyle(el);
    return style.position === 'fixed' && el.getBoundingClientRect().right <= 0;
  });
  if (isMobileHidden) {
    // Open the hamburger drawer
    await page
      .locator('button')
      .filter({ has: page.locator('.pi-bars') })
      .first()
      .click();
    // Wait for sidebar to slide in (class changes to translate-x-0)
    await expect(sidebar).toHaveClass(/translate-x-0/, { timeout: 3000 });
  }
  await navButton(page, label).click();
  // On mobile, the drawer auto-closes on route change.
  // Wait for URL to settle first (Mobile Safari needs extra time for SPA navigation)
  const pathMap: Record<string, string> = {
    'Live Studio': '/',
    Soundboard: '/scripts',
    Account: '/account',
  };
  const titleMap: Record<string, string> = {
    'Live Studio': 'Live Studio',
    Soundboard: 'Soundboard Manager',
    Account: 'Account',
  };
  const expectedPath = pathMap[label];
  await page.waitForURL((url) => url.pathname === expectedPath, {
    timeout: 8000,
  });
  // Wait for route to settle so subsequent navigateTo calls see the closed state.
  const expectedTitle = titleMap[label];
  await expect(pageTitle(page)).toHaveText(expectedTitle, { timeout: 8000 });
  // If mobile, wait for drawer close animation to complete
  if (isMobileHidden) {
    await expect(sidebar).toHaveClass(/-translate-x-full/, { timeout: 3000 });
  }
}

/** Get the page title element (h1 in AppHeader) */
export function pageTitle(page: Page): Locator {
  return page.locator('h1');
}

// ─── Scripts Page ────────────────────────────────────────────────────

/** Open the three-dot "More options" menu in the top bar */
async function openTopbarMenu(page: Page) {
  await page
    .locator('#topbar-actions')
    .locator('button[aria-label="More options"]')
    .click();
}

/** Click the Add Audio Group menu item from the three-dot header menu */
export async function clickAddScript(page: Page) {
  await openTopbarMenu(page);
  const menu = page.locator('.p-menu').filter({ hasText: 'Add Audio Group' });
  await expect(menu).toBeVisible();
  await menu.getByText('Add Audio Group').click();
}

/** Fill the create-script dialog and submit */
export async function createScriptViaUI(page: Page, name: string) {
  await clickAddScript(page);
  const dialog = page
    .locator('.p-dialog')
    .filter({ hasText: 'Create New Audio Group' });
  await expect(dialog).toBeVisible();
  await dialog.locator('#script-name').fill(name);
  await dialog.getByRole('button', { name: 'Create Now' }).click();
  // Wait for dialog to close — guarantees the API call completed and
  // the scriptCreated event has been emitted (so auto-expansion is applied).
  await expect(dialog).toBeHidden();
}

/**
 * Scope to a specific script card on the Scripts page.
 * Uses PrimeVue Card class + text filter.
 * .first() guards against parallel tests creating same-named scripts.
 */
export function scriptCard(page: Page, name: string): Locator {
  return page.locator('.p-card').filter({ hasText: name }).first();
}

/**
 * Scope to a specific script card by its exact script ID.
 * Finds the card via `data-script-id` attribute set on the PrimeVue Card root,
 * which is always unique — avoids collisions with same-named scripts.
 */
export function scriptCardById(page: Page, scriptId: string): Locator {
  return page.locator(`[data-script-id="${scriptId}"]`);
}

/** Get the file upload input within a script card */
export function fileInput(card: Locator): Locator {
  return card.locator('input[type="file"]');
}

/** Get render buttons (pi-refresh icon) within a scope */
export function renderButtons(scope: Locator): Locator {
  return scope
    .locator('button')
    .filter({ has: scope.page().locator('.pi-refresh') });
}

/** Get the "render all missing" button (pi-bolt icon) within a scope */
export function renderAllButton(scope: Locator): Locator {
  return scope
    .locator('button')
    .filter({ has: scope.page().locator('.pi-bolt') });
}

/** Get the three-dot menu button within a script card */
export function scriptMenuButton(card: Locator): Locator {
  return card.locator('button[aria-label="Group options"]');
}

/** Open the three-dot menu and click a menu item by label */
export async function clickScriptMenuItem(card: Locator, label: string) {
  await scriptMenuButton(card).click();
  const menu = card.page().locator('.p-menu').filter({ hasText: label });
  await expect(menu).toBeVisible();
  await menu.getByText(label).click();
}

/** Click inline Rename button on an expanded script card */
export async function clickRenameButton(card: Locator) {
  await card.getByRole('button', { name: 'Rename' }).click();
}

/** Click inline Change Color button on an expanded script card */
export async function clickChangeColorButton(card: Locator) {
  await card.getByRole('button', { name: 'Change Color' }).click();
}

/** Click inline Delete Group button on an expanded script card */
export async function deleteScriptViaMenu(card: Locator) {
  await card.getByRole('button', { name: 'Delete Group' }).click();
}

/** Check if "Render All Missing" inline button is visible on an expanded script card */
export async function expectRenderAllInMenu(card: Locator) {
  await expect(
    card.getByRole('button', { name: 'Render All Missing' }),
  ).toBeVisible();
}

/** Click inline Render All Missing button on an expanded script card */
export async function clickRenderAllMissingInCard(card: Locator) {
  await card.getByRole('button', { name: 'Render All Missing' }).click();
}

/** Click confirm in a PrimeVue ConfirmDialog */
export async function confirmDelete(page: Page) {
  const dialog = page.locator('.p-dialog').filter({
    has: page.locator('button').filter({ hasText: 'Delete' }),
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).click();
}

/** Get count of "Ready" status labels within a scope */
export function readyLabels(scope: Locator): Locator {
  return scope.getByText('Ready', { exact: true });
}

/** Get count of "Missing" status labels within a scope */
export function missingLabels(scope: Locator): Locator {
  return scope.getByText('Missing', { exact: true });
}

// ─── Live Studio Page ───────────────────────────────────────────────

/**
 * Set the speed via the slider in the sub-header.
 * Uses ARIA role="slider" + keyboard arrows for precision.
 */
export async function setSpeed(page: Page, targetSpeed: number) {
  const subHeader = page.locator('#topbar-secondary');
  await expect(subHeader).toBeVisible();

  // First slider = speed, second slider = volume
  const speedSlider = subHeader.getByRole('slider').first();
  const currentValue = parseInt(
    (await speedSlider.getAttribute('aria-valuenow')) ?? '10',
  );
  const targetValue = Math.round(targetSpeed * 10);

  if (currentValue === targetValue) return;

  await speedSlider.focus();
  const steps = targetValue - currentValue;
  const key = steps > 0 ? 'ArrowRight' : 'ArrowLeft';

  for (let i = 0; i < Math.abs(steps); i++) {
    await speedSlider.press(key);
  }
}

/** Get the speed display text (e.g. "1.0x") */
export function speedDisplay(page: Page): Locator {
  return page.locator('#topbar-secondary .tabular-nums').first();
}

/** Get a script tile button on the Live Studio by name */
export function scriptTile(page: Page, name: string): Locator {
  // Use .first() to guard against parallel tests creating same-named scripts
  return page.getByRole('button', { name, exact: true }).first();
}

/** Get the STOP NOW button (only visible during playback, teleported to header) */
export function stopButton(page: Page): Locator {
  return page.locator('#topbar-actions').getByText('STOP NOW');
}

/**
 * Click the STOP NOW button.
 * The button lives inside a Teleport that Vue can re-render, causing the DOM
 * element to detach/re-attach. `dispatchEvent('click')` bypasses Playwright's stability
 * check so the click fires immediately without waiting for a stable element.
 */
export async function clickStopButton(page: Page) {
  await expect(stopButton(page)).toBeVisible({ timeout: 5000 });
  await page
    .locator('#topbar-actions')
    .getByText('STOP NOW')
    .dispatchEvent('click');
  await expect(stopButton(page)).toBeHidden({ timeout: 5000 });
}

// ─── Render Dialog ──────────────────────────────────────────────────

/** Get the render progress dialog */
export function renderDialog(page: Page): Locator {
  return page.locator('.p-dialog').filter({ hasText: 'Audio Processing' });
}

// ─── Upload Progress Dialog ─────────────────────────────────────────

/** Get the upload progress dialog */
export function uploadProgressDialog(page: Page): Locator {
  return page.locator('.p-dialog').filter({ hasText: 'Uploading Files' });
}

/**
 * Wait for the upload progress dialog to appear, then disappear (auto-close on success).
 * Use after triggering a file upload to assert the full upload flow completes.
 */
export async function waitForUploadComplete(
  page: Page,
  timeout = 15000,
): Promise<void> {
  const dialog = uploadProgressDialog(page);
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog).toBeHidden({ timeout });
}

// ─── Toast ──────────────────────────────────────────────────────────

/** Wait for a toast message to appear */
export async function expectToast(page: Page, text: string, timeout = 5000) {
  await expect(
    page.locator('.p-toast-message').filter({ hasText: text }),
  ).toBeVisible({ timeout });
}

// ─── Sort Mode ──────────────────────────────────────────────────────

/** Enter Sort Mode by opening the three-dot menu and clicking Sort Groups */
export async function enterSortMode(page: Page) {
  await openTopbarMenu(page);
  const menu = page.locator('.p-menu').filter({ hasText: 'Sort Groups' });
  await expect(menu).toBeVisible();
  await menu.getByText('Sort Groups').click();
}

/** Exit Sort Mode by clicking Done */
export async function exitSortMode(page: Page) {
  await page.locator('#topbar-actions').getByText('Done').click();
}

/** Open the three-dot menu and click "Render Missing Variants" */
export async function clickRenderAllMissingGlobal(page: Page) {
  await openTopbarMenu(page);
  const menu = page
    .locator('.p-menu')
    .filter({ hasText: 'Render Missing Variants' });
  await expect(menu).toBeVisible();
  await menu.getByText('Render Missing Variants').click();
}

// Console & Network monitoring helpers have been moved to ./monitoring.ts

// ─── Script Card Expand/Collapse ────────────────────────────────────

/**
 * Toggle a script card expand/collapse by clicking the chevron button.
 * Works regardless of current state.
 */
export async function toggleScriptCard(card: Locator): Promise<void> {
  const chevron = card.locator('button').filter({
    has: card.page().locator('.pi-chevron-up, .pi-chevron-down'),
  });
  await chevron.click();
}

/**
 * Returns true when the script card's upload drop zone is visible,
 * which indicates the card is expanded.
 */
export async function isScriptCardExpanded(card: Locator): Promise<boolean> {
  const dropZone = card.locator('[role="button"]').first();
  return dropZone.isVisible();
}

/**
 * Get the missing-variants warning indicator on a script card.
 * Indicator is only present in the DOM when the card is collapsed and has missing variants.
 * Use toBeAttached() / not.toBeAttached() to assert presence.
 */
export function missingVariantsBadge(card: Locator): Locator {
  return card.locator('[data-testid="missing-variants-indicator"]');
}

/**
 * Block FFmpeg WASM core downloads so rendering hangs at the "loading FFmpeg"
 * phase indefinitely. This lets tests verify render-dialog UI without waiting
 * for actual WASM compilation or risking the dialog closing before assertions.
 *
 * Call BEFORE page.goto(). Only blocks the core WASM/JS files fetched during
 * ffmpegService.load(), NOT the @ffmpeg package JS module imports.
 */
export async function blockFfmpegLoad(page: Page): Promise<void> {
  await page.route('**/ffmpeg-core*', () => {
    // Never fulfill — keeps the request pending forever
  });
}
