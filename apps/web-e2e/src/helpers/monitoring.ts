/** Console and network monitoring helpers for E2E tests */

import type { Page } from '@playwright/test';

/** Collect console errors during a test */
export function monitorConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Collect failed network requests during a test */
export function monitorNetworkErrors(
  page: Page,
): Array<{ url: string; status: number }> {
  const errors: Array<{ url: string; status: number }> = [];
  page.on('response', (response) => {
    if (
      response.url().includes('/api/') &&
      !response.ok() &&
      response.status() !== 204
    ) {
      errors.push({ url: response.url(), status: response.status() });
    }
  });
  return errors;
}
