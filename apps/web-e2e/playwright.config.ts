import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
import { cpus } from 'os';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://127.0.0.1:18180';
const cpuCores = cpus().length;
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Block service workers so page.route() can intercept all requests */
    serviceWorkers: 'block',
    /* Pre-set localStorage to bypass the fake-auth redirect on every test */
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [{ name: 'isFakeAuthenticated', value: 'true' }],
        },
      ],
    },
  },
  fullyParallel: true,
  workers: Math.max(1, Math.floor(cpuCores / 2)),
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      name: 'api',
      command: 'pnpm exec nx run api:serve',
      port: 18181,
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
    {
      name: 'web',
      command: 'pnpm exec nx run web:serve',
      port: 18180,
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@mobile-only/,
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
      grepInvert: /@webkit-incompatible|@chromium-only|@desktop-only/,
    },
  ],
});
