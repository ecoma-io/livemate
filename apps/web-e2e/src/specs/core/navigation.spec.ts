import { test, expect } from '@playwright/test';
import { navButton, pageTitle, navigateTo } from '../../helpers/pages';

test.describe('Navigation & Layout', () => {
  // ─── Route Loading ─────────────────────────────────────────────────

  test('root URL loads Live Studio with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(pageTitle(page)).toHaveText('Live Studio');
  });

  test('/scripts loads Soundboard Manager with correct title', async ({
    page,
  }) => {
    await page.goto('/scripts');
    await expect(pageTitle(page)).toHaveText('Soundboard Manager');
  });

  // ─── Sidebar Navigation ───────────────────────────────────────────

  test('sidebar shows Live Studio and Soundboard links', async ({ page }) => {
    await page.goto('/');
    await expect(navButton(page, 'Live Studio')).toBeVisible();
    await expect(navButton(page, 'Soundboard')).toBeVisible();
    await expect(navButton(page, 'Account')).toBeVisible();
  });

  test('clicking Soundboard navigates to /scripts', async ({ page }) => {
    await page.goto('/');
    await navigateTo(page, 'Soundboard');
    await expect(pageTitle(page)).toHaveText('Soundboard Manager');
    await expect(page).toHaveURL(/\/scripts$/);
  });

  test('clicking Account navigates to /account', async ({ page }) => {
    await page.goto('/');
    await navigateTo(page, 'Account');
    await expect(pageTitle(page)).toHaveText('Account');
    await expect(page).toHaveURL(/\/account$/);
  });

  test('clicking Live Studio navigates back to /', async ({ page }) => {
    await page.goto('/scripts');
    await navigateTo(page, 'Live Studio');
    await expect(pageTitle(page)).toHaveText('Live Studio');
    await expect(page).toHaveURL(/\/$/);
  });

  test('roundtrip navigation preserves state', async ({ page }) => {
    await page.goto('/');
    await expect(pageTitle(page)).toHaveText('Live Studio');

    await navigateTo(page, 'Soundboard');
    await expect(pageTitle(page)).toHaveText('Soundboard Manager');

    await navigateTo(page, 'Live Studio');
    await expect(pageTitle(page)).toHaveText('Live Studio');
  });

  test('active nav item is visually highlighted', async ({ page }) => {
    await page.goto('/');
    await expect(navButton(page, 'Live Studio')).toHaveClass(/bg-primary-500/);
    await expect(navButton(page, 'Soundboard')).not.toHaveClass(
      /bg-primary-500/,
    );

    await navigateTo(page, 'Soundboard');
    await expect(navButton(page, 'Soundboard')).toHaveClass(/bg-primary-500/);
    await expect(navButton(page, 'Live Studio')).not.toHaveClass(
      /bg-primary-500/,
    );
  });

  test('LiveMate brand click navigates to dashboard @desktop-only', async ({
    page,
  }) => {
    await page.goto('/scripts');
    await expect(pageTitle(page)).toHaveText('Soundboard Manager');

    // Click the brand/logo area (the first clickable div in aside with "Live Mate" text)
    await page.locator('aside').getByText('Live Mate').click();
    await expect(pageTitle(page)).toHaveText('Live Studio');
  });

  test('LiveMate brand click navigates to dashboard @mobile-only', async ({
    page,
  }) => {
    await page.goto('/scripts');
    await expect(pageTitle(page)).toHaveText('Soundboard Manager');

    // Open drawer first on mobile
    await page
      .locator('button')
      .filter({ has: page.locator('.pi-bars') })
      .first()
      .click();
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/translate-x-0/, { timeout: 3000 });

    // Click the brand/logo area (the first clickable div in aside with "Live Mate" text)
    await page.locator('aside').getByText('Live Mate').click();
    await expect(pageTitle(page)).toHaveText('Live Studio');
  });

  // ─── Sub-header Visibility ─────────────────────────────────────────

  test('sub-header with speed/volume sliders visible on Dashboard only', async ({
    page,
  }) => {
    await page.goto('/');
    const subHeader = page.locator('#topbar-secondary');
    await expect(subHeader).toBeVisible();
    // Should have exactly 2 sliders (speed + volume)
    await expect(subHeader.getByRole('slider')).toHaveCount(2);

    // Navigate to Scripts - sub header should hide
    await navigateTo(page, 'Soundboard');
    await expect(subHeader).toBeHidden();

    // Navigate back - sub header should reappear
    await navigateTo(page, 'Live Studio');
    await expect(subHeader).toBeVisible();
  });

  // ─── Mobile Drawer ─────────────────────────────────────────────────

  test('mobile drawer toggle works @mobile-only', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');

    // On mobile, sidebar should be off-screen (translated)
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Click hamburger to open drawer
    await page
      .locator('button')
      .filter({ has: page.locator('.pi-bars') })
      .first()
      .click();
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Click backdrop to close (click far-right to avoid sidebar overlap)
    const backdrop = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(backdrop).toBeVisible();
    await backdrop.click({ position: { x: 350, y: 300 } });
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});
