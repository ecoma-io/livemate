import { test, expect } from '@playwright/test';

// Override storageState to ensure login page is shown (not bypass login)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page', () => {
  // ─── Redirect & Display ───────────────────────────────────────────

  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows title and subtitle', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('LiveMate')).toBeVisible();
    await expect(page.getByText('Sign in to continue')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('username-input').fill('wronguser');
    await page.getByTestId('password-input').fill('wrongpass');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText(
      'Invalid username or password',
    );
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('username-input').fill('vanila');
    await page.getByTestId('password-input').fill('Vanila123');
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
  });

  // ─── Responsive Layout ────────────────────────────────────────────

  test('@desktop: card is constrained width and does not fill viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    const card = page.locator('[data-testid="login-card"]');
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    // Card should be constrained (max-w-sm ≈ 384px), not full viewport width
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect(box?.width ?? 0).toBeLessThan(640);
    expect(box?.height ?? 0).toBeGreaterThan(0);
    expect(box?.height ?? 0).toBeLessThan(800);
  });

  test('@mobile: card fills full viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    const card = page.locator('[data-testid="login-card"]');
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    // On mobile the card should fill the full viewport height
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(844 * 0.95);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(390 * 0.95);
  });

  test('@mobile: outer container uses primary background color', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    const outer = page.locator('[data-testid="login-outer"]');
    const bgColor = await outer.evaluate((el) =>
      getComputedStyle(el).backgroundColor,
    );
    // primary-800 in PrimeVue Aura theme is a deep purple/indigo, not white/gray
    // We just assert it's not the neutral surface color (rgb(248, 250, 252) = surface-50)
    expect(bgColor).not.toBe('rgb(248, 250, 252)');
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
