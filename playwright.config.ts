import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    // ── Setup project ──────────────────────────────────────────────────────────
    // Runs tests/ch04/auth.setup.ts once before the authenticated browser projects.
    // It registers a test user, logs in, and saves the session to
    // playwright/.auth/user.json so authenticated tests can reuse it.
    {
      name: 'setup',
      testMatch: /ch04\/auth\.setup\.ts/,
    },

    // ── Unauthenticated browser projects ──────────────────────────────────────
    // These projects run all spec files that do NOT use storageState.
    // They have no dependency on the setup project.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /ch04\/authenticated\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /ch04\/authenticated\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /ch04\/authenticated\.spec\.ts/,
    },

    // ── Authenticated browser projects ────────────────────────────────────────
    // These projects run only tests/ch04/authenticated.spec.ts and depend on the
    // setup project having run first (so the auth file exists).
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: /ch04\/authenticated\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'firefox-auth',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: /ch04\/authenticated\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'webkit-auth',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: /ch04\/authenticated\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // command: 'npm run dev',
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
