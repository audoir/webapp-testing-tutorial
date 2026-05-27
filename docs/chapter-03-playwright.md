# Chapter 3 — End-to-End Testing with Playwright

## What is Playwright?

[Playwright](https://playwright.dev/) is an end-to-end testing framework maintained by Microsoft. It automates real browsers — Chromium, Firefox, and WebKit — using a single, unified API. Unlike Jest and React Testing Library, which run in Node.js against a simulated DOM, Playwright launches an actual browser, loads your application over HTTP, and drives it exactly as a real user would.

| Feature | Description |
|---------|-------------|
| **Multi-browser** | Tests run against Chromium, Firefox, and WebKit in a single command |
| **Auto-wait** | Playwright automatically waits for elements to be visible and stable before interacting |
| **Network control** | Intercept, mock, or block HTTP requests during a test |
| **Tracing & screenshots** | Capture traces, screenshots, and videos on failure for easy debugging |

### Why use Playwright after Jest and RTL?

Jest and RTL test your code in isolation — they mock the network, the router, and the database. Playwright tests the **whole system**: the real Next.js server, the real database, and the real browser. This catches a class of bugs that unit and component tests cannot:

- A page that renders correctly in jsdom but breaks in a real browser due to CSS or JavaScript differences.
- A navigation flow that works in isolation but fails when the server returns unexpected data.
- A form that submits correctly in a unit test but silently drops fields in the real HTTP request.

**Use Jest or RTL instead** when you want fast, isolated feedback on a single function or component. The three tools complement each other:

| Tool | What it tests | Speed | Isolation |
|------|--------------|-------|-----------|
| Jest | Pure functions, API logic | Very fast | Full (mocked dependencies) |
| React Testing Library | Component rendering & interaction | Fast | High (mocked network & router) |
| Playwright | Full user journeys in a real browser | Slow | None (real server & browser) |

---

## Project Setup

### Installation

Playwright was installed using the official initialiser:

```bash
npm init playwright@latest
```

This command installs `@playwright/test` as a dev dependency and creates `playwright.config.ts` with sensible defaults.

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    // command: 'npm run dev',
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Key settings explained:

| Setting | Value | Meaning |
|---------|-------|---------|
| `testDir` | `'./tests'` | Playwright looks for test files in the `tests/` folder |
| `fullyParallel` | `true` | All tests run in parallel across workers |
| `forbidOnly` | `!!process.env.CI` | Fails the build if `test.only` is accidentally committed |
| `retries` | `2` on CI, `0` locally | Retries flaky tests on CI before marking them as failed |
| `baseURL` | `'http://localhost:3000'` | Allows `page.goto('/')` instead of the full URL |
| `trace` | `'on-first-retry'` | Saves a trace file when a test is retried |
| `webServer.command` | `'npm run build && npm run start'` | Builds and starts the Next.js production server before the test suite runs |
| `webServer.reuseExistingServer` | `!process.env.CI` | Reuses a running server locally; always starts a fresh one on CI |

### `package.json` — test script

```json
"scripts": {
  "test:playwright": "node -e \"const{existsSync}=require('fs');if(!existsSync('tests/ch05/visual.spec.ts-snapshots')){const{execSync}=require('child_process');execSync('npx playwright test tests/ch05/visual.spec.ts --update-snapshots',{stdio:'inherit'})}\" && playwright test"
}
```

The `test:playwright` name keeps Playwright separate from the Jest suite (`test:jest`). The script also auto-generates visual regression snapshots on first run — see [Chapter 5](./chapter-05-playwright-visual.md) for details.

### File structure

Playwright tests live in a dedicated top-level `tests/` folder, organised into subdirectories that mirror the tutorial chapters:

```
tests/
├── ch03/
│   └── landing.spec.ts         ← Chapter 3: first test
├── ch04/
│   ├── auth.spec.ts            ← Chapter 4: locators, forms, auth flows
│   ├── products.spec.ts        ← Chapter 4: network interception, lists
│   ├── auth.setup.ts           ← Chapter 4: session setup
│   └── authenticated.spec.ts   ← Chapter 4: storageState tests
└── ch05/
    └── visual.spec.ts          ← Chapter 5: visual regression tests

app/
├── page.test.tsx               ← Component tests (Jest + RTL)
└── cart/
    └── page.test.tsx           ← Component tests (Jest + RTL)

lib/
├── price.test.ts               ← Unit tests (Jest)
├── products.test.ts            ← Unit tests (Jest)
└── cartApi.test.ts             ← Unit tests (Jest)
```

---

## Your First Test — `tests/ch03/landing.spec.ts`

**`app/page.tsx`** — the home page renders an `<h1>` with the text "Product Catalog" once the products have loaded from the API.

```ts
import { test, expect } from '@playwright/test'

test('landing page has a heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Product Catalog')
})
```

### Key concepts

| Concept | Code | Meaning |
|---------|------|---------|
| **`test`** | `test('description', async ({ page }) => { … })` | Defines a single E2E test case. The `page` fixture is a fresh browser tab |
| **`page.goto`** | `await page.goto('/')` | Navigates the browser to the `baseURL` and waits for the page to load |
| **`page.locator`** | `page.locator('h1')` | Creates a locator for elements matching the CSS selector |
| **`expect(locator).toContainText`** | `await expect(page.locator('h1')).toContainText('…')` | Asserts the element's text content contains the given string |

### The `page` fixture

Every Playwright test receives a `page` object via the `{ page }` destructured argument. Playwright creates a fresh browser context and tab for each test, then tears it down afterwards — tests are fully isolated, and multiple tests can run in parallel without interfering with each other.

### Auto-waiting

When you call `expect(page.locator('h1')).toContainText('Product Catalog')`, Playwright does not check the DOM just once. Instead, it:

1. Waits for an `h1` element to exist in the DOM.
2. Waits for it to be visible (not hidden by CSS).
3. Retries the text assertion until it passes or the timeout expires.

This is especially useful on the landing page, where the heading only appears after the products API call resolves. There is no need for a manual `waitFor`.

---

## Running the Tests

Run the full E2E suite:

```bash
npm run test:playwright
```

The `webServer` configuration automatically builds and starts the production server (`npm run build && npm run start`) before the tests begin and shuts it down afterwards. This ensures tests run against the production build rather than the development server.

### Useful CLI commands

```bash
# Run tests in headed mode (see the browser)
npx playwright test tests/ch03/landing.spec.ts --headed

# Run tests for a specific browser
npx playwright test --project=chromium

# Run tests with a specific tag
npx playwright test --grep @smoke

# Open the interactive UI mode
npx playwright test --ui

# View the HTML report
npx playwright show-report
```

### Running on CI

On CI (`CI=true`):

- `retries: 2` — each failing test is retried twice before being marked as failed.
- `workers: 1` — tests run sequentially to avoid resource contention.
- `forbidOnly: true` — the build fails if `test.only` is present in any test file.

To install the browser binaries on a CI machine:

```bash
npx playwright install --with-deps
```

---

## Summary

In this chapter you learned:

1. **What Playwright is** — a multi-browser E2E testing framework that automates real browsers.
2. **How it differs from Jest and RTL** — Playwright tests the full stack (real server, real browser, real database) rather than isolated units or components.
3. **How to configure it** — `playwright.config.ts` sets the `baseURL`, enables the `webServer` to auto-start Next.js, and configures three browser projects.
4. **How to write a test** — `test`, `page.goto`, and `expect` assertions with auto-waiting.
5. **How to run tests** — `npm run test:playwright` (no build step required; the dev server starts automatically).

**Next chapter:** [Playwright — Locators, Network Interception & Auth Flows](./chapter-04-playwright-advanced.md)

**Back to:** [Table of Contents](../README.md)