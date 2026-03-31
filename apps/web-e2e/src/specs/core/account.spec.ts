import { test, expect } from '@playwright/test';
import { navigateTo, pageTitle } from '../../helpers/pages';

/** Navigate to /account and wait for the SPA to fully settle */
async function gotoAccount(page: import('@playwright/test').Page) {
  await page.goto('/account');
  await expect(pageTitle(page)).toHaveText('Account');
}

/** Click a PrimeVue Select dropdown and wait for its listbox overlay to appear */
async function openSelect(page: import('@playwright/test').Page, testId: string) {
  await page.getByTestId(testId).click();
  await expect(page.getByRole('listbox')).toBeVisible();
}

test.describe('Account Page', () => {
  test('displays language and display mode selects and logout button', async ({
    page,
  }) => {
    await gotoAccount(page);
    await expect(page.getByTestId('locale-select')).toBeVisible();
    await expect(page.getByTestId('theme-select')).toBeVisible();
    await expect(page.getByTestId('logout-button')).toBeVisible();
  });

  test('changing language updates sidebar labels', async ({
    page,
  }) => {
    await gotoAccount(page);
    // Open locale dropdown and select English
    await openSelect(page, 'locale-select');
    await page.getByRole('option', { name: 'English' }).click();
    // Wait for the dropdown to close and reactivity to propagate
    await expect(page.getByTestId('locale-select')).toContainText('English');
    // Sidebar nav labels should now be in English
    await expect(
      page.locator('aside button').filter({ hasText: 'Live Studio' }),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('aside button').filter({ hasText: 'Soundboard' }),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('aside button').filter({ hasText: 'Account' }),
    ).toBeVisible({ timeout: 8000 });
  });

  test('changing language persists after reload', async ({ page }) => {
    await gotoAccount(page);
    // Switch to English
    await openSelect(page, 'locale-select');
    await page.getByRole('option', { name: 'English' }).click();
    await expect(
      page.locator('aside button').filter({ hasText: 'Account' }),
    ).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(
      page.locator('aside button').filter({ hasText: 'Account' }),
    ).toBeVisible({ timeout: 8000 });
  });

  test('changing display mode to dark adds app-dark class', async ({
    page,
  }) => {
    await gotoAccount(page);
    // Switch to dark mode
    await openSelect(page, 'theme-select');
    await page.getByRole('option', { name: 'Dark Mode' }).click();
    // html element should have app-dark class
    await expect(page.locator('html')).toHaveClass(/app-dark/);
  });

  test('changing display mode to light removes app-dark class', async ({
    page,
  }) => {
    await gotoAccount(page);
    // Switch to light mode
    await openSelect(page, 'theme-select');
    await page.getByRole('option', { name: 'Light Mode' }).click();
    // html element should NOT have app-dark class
    await expect(page.locator('html')).not.toHaveClass(/app-dark/);
  });

  test('display mode persists after reload', async ({ page }) => {
    await gotoAccount(page);
    // Switch to dark mode
    await openSelect(page, 'theme-select');
    await page.getByRole('option', { name: 'Dark Mode' }).click();
    await expect(page.locator('html')).toHaveClass(/app-dark/);

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/app-dark/, {
      timeout: 8000,
    });
  });

  test('logout redirects to login page', async ({ page }) => {
    await gotoAccount(page);
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 8000 });
  });

  test('header does not contain theme toggle or logout buttons', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.locator('[data-testid="theme-toggle-button"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('header [data-testid="logout-button"]'),
    ).toHaveCount(0);
  });

  test('navigating to account from sidebar works', async ({ page }) => {
    await page.goto('/');
    await navigateTo(page, 'Account');
    await expect(pageTitle(page)).toHaveText('Account');
  });
});
