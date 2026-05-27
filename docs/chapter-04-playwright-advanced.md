# Chapter 4 — Playwright: Locators, Network Interception, Auth Flows & API Testing

This chapter builds on the basics from [Chapter 3](./chapter-03-playwright.md) by introducing the locators, assertions, and patterns you'll use in real test suites. Each concept is demonstrated with a focused test from `tests/ch04/auth.spec.ts` or `tests/ch04/products.spec.ts`.

---

## Locators and Assertions

### `getByRole` and `toHaveURL` — navigation test

```ts
// tests/ch04/auth.spec.ts
test('clicking "Sign In" in the navbar navigates to /login @smoke', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
})
```

`page.getByRole('link', { name: 'Sign In' })` finds the navbar link by its ARIA role and accessible name — the same accessible-first philosophy as React Testing Library's `getByRole`.

`expect(page).toHaveURL('/login')` asserts the browser navigated to the expected URL. Playwright auto-waits for the navigation to complete before checking.

| Concept | Code | Meaning |
|---------|------|---------|
| `getByRole` | `page.getByRole('link', { name: '…' })` | Finds an element by its ARIA role and accessible name |
| `toHaveURL` | `expect(page).toHaveURL('/login')` | Asserts the current URL matches the given path |
| `toBeVisible` | `expect(locator).toBeVisible()` | Asserts the element exists in the DOM and is not hidden |

---

### `getByLabel` and `pressSequentially` — form interaction

```ts
test('shows an error for wrong credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username').pressSequentially('nobody', { delay: 50 })
  await page.getByLabel('Password').pressSequentially('wrongpassword', { delay: 50 })
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('Invalid username or password')).toBeVisible()
})
```

`page.getByLabel('Username')` finds the input by its associated `<label>` text. This works because the login form links each label to its input via `htmlFor`/`id`. It also tests accessibility — a screen reader uses the same association to announce the field name.

`locator.pressSequentially('…', { delay: 50 })` types the value one character at a time. This is more reliable than `fill` in WebKit, which can silently drop characters when the input value is set all at once.

| Concept | Code | Meaning |
|---------|------|---------|
| `getByLabel` | `page.getByLabel('Username')` | Finds an input by its associated `<label>` |
| `pressSequentially` | `locator.pressSequentially('value', { delay: 50 })` | Types character-by-character; more reliable than `fill` in WebKit |
| `getByText` | `page.getByText('…')` | Finds any element whose text content contains the string |

---

### `page.route` — network interception

```ts
// tests/ch04/products.spec.ts
test('product catalog renders items returned by the API', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 99, name: 'Test Widget', description: 'A widget for testing.',
          price: 9.99, image_url: 'https://placehold.co/400x300?text=Widget',
          category: 'Test', stock: 10 },
      ]),
    })
  })

  await page.goto('/')
  await expect(page.getByText('Test Widget')).toBeVisible()
  await expect(page.getByText('$9.99')).toBeVisible()
})
```

`page.route(pattern, handler)` intercepts every network request whose URL matches `pattern`. `route.fulfill(…)` short-circuits the real request and returns a hand-crafted JSON response instead — Playwright's equivalent of `jest.mock` or `msw`.

> **Important:** `page.route` must be called **before** `page.goto`, so the intercept is registered before the browser makes any requests.

| Concept | Code | Meaning |
|---------|------|---------|
| `page.route` | `page.route('/api/products', handler)` | Registers a handler that intercepts matching requests |
| `route.fulfill` | `route.fulfill({ status, body, … })` | Responds to the intercepted request with custom data |

---

### Protected route redirect

```ts
test('visiting /cart without being logged in redirects to /login', async ({ page }) => {
  await page.goto('/cart')
  await expect(page).toHaveURL('/login')
})
```

Because each Playwright test gets a fresh browser context with no cookies, the user is always logged out at the start. Navigating to `/cart` triggers the redirect logic in `app/cart/page.tsx`, and `toHaveURL` confirms the redirect happened. This kind of test is impossible to write with Jest and RTL without mocking the router.

---

### `page.request` — API calls from a test

```ts
test('a registered user can log in and see their username in the navbar', async ({ page }) => {
  const username = `user_${Date.now()}`
  await page.request.post('/api/auth/register', {
    data: { username, email: `${username}@example.com`, password: 'password123' },
  })

  await page.goto('/login')
  await page.getByLabel('Username').pressSequentially(username, { delay: 50 })
  await page.getByLabel('Password').pressSequentially('password123', { delay: 50 })
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByText(`Hi, ${username}`, { exact: false })).toBeVisible()
})
```

`page.request.post(url, { data })` makes an HTTP request directly from the test, without going through the browser UI. Using `Date.now()` in the username guarantees a unique account on every run.

This is a **full end-to-end journey**: the test touches the register API, the login form, the session cookie, the `/api/auth/me` endpoint, and the Navbar component — all in one flow.

| Concept | Code | Meaning |
|---------|------|---------|
| `page.request.post` | `page.request.post(url, { data })` | Makes an HTTP POST from the test context (shares cookies with the page) |
| Unique test data | `` `user_${Date.now()}` `` | Generates a unique value so tests don't conflict with each other |

---

### `test.describe` and `test.beforeEach` — grouping tests

```ts
// tests/ch04/auth.spec.ts (excerpt)
test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows an error for wrong credentials', async ({ page }) => {
    await page.getByLabel('Username').pressSequentially('nobody', { delay: 50 })
    await page.getByLabel('Password').pressSequentially('wrongpassword', { delay: 50 })
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Invalid username or password')).toBeVisible()
  })

  test('shows the Sign In heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  })
})
```

`test.describe` groups related tests under a shared label that appears in the test output and HTML report. `test.beforeEach` runs setup code before every test in the group, eliminating repeated `page.goto` calls.

| Concept | Code | Meaning |
|---------|------|---------|
| `test.describe` | `test.describe('Label', () => { … })` | Groups related tests under a shared label |
| `test.beforeEach` | `test.beforeEach(async ({ page }) => { … })` | Runs setup code before every test in the group |

---

### `getByTestId` and list assertions

`getByTestId` is the most stable locator — test IDs are not affected by text changes, CSS refactors, or ARIA restructuring. The product cards use `data-testid={`add-to-cart-${product.id}`}` on the button:

```ts
// tests/ch04/products.spec.ts
test('product catalog shows one card per product', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Widget A', description: '', price: 9.99, image_url: '', category: 'Tools', stock: 5 },
        { id: 2, name: 'Widget B', description: '', price: 19.99, image_url: '', category: 'Tools', stock: 3 },
        { id: 3, name: 'Widget C', description: '', price: 29.99, image_url: '', category: 'Tools', stock: 1 },
      ]),
    })
  })

  await page.goto('/')

  const productNames = page.locator('h3')
  await expect(productNames).toHaveCount(3)
  await expect(productNames.first()).toContainText('Widget A')
  await expect(productNames.nth(1)).toContainText('Widget B')
  await expect(productNames.nth(2)).toContainText('Widget C')
})
```

| Concept | Code | Meaning |
|---------|------|---------|
| `getByTestId` | `page.getByTestId('id')` | Finds an element by its `data-testid` attribute |
| `toHaveCount` | `expect(locator).toHaveCount(n)` | Asserts that exactly `n` elements match the locator |
| `.first()` / `.nth(n)` | `locator.first()`, `locator.nth(2)` | Selects the first or nth element from a multi-match locator |

---

## Authentication and Session Management

The tests above register a fresh user per test with `page.request.post`. This is self-contained but has a cost: every test that needs an authenticated user must repeat the full login sequence.

Playwright solves this with **global authentication setup**: run the login flow once, save the resulting session cookie to a file, and load that file at the start of every test that needs it.

### Production Build Testing & Session Configuration

When running tests against the production build (`npm run build && npm run start`), session cookies require special configuration to work on localhost. The session configuration in `lib/session.ts` includes:

```ts
export const sessionOptions: SessionOptions = {
  // ...
  cookieOptions: {
    // Only use secure cookies in production AND when not running locally
    // This allows tests to work with the production build on localhost
    secure: process.env.NODE_ENV === "production" && 
            !process.env.CI &&
            process.env.VERCEL_ENV === "production",
    httpOnly: true,
  },
};
```

This configuration ensures:
- **Local development**: `secure: false` (works with HTTP)
- **Local testing with production build**: `secure: false` (works with HTTP on localhost)
- **CI environments**: `secure: false` (works with HTTP test servers)
- **Production deployments**: `secure: true` (requires HTTPS for security)

Without this configuration, authentication tests would fail when running against the production build because session cookies would require HTTPS but the test server runs on HTTP. This is particularly important for WebKit tests, which can be more sensitive to cookie security settings.

### How session persistence works

Playwright's `storageState` feature serialises the browser's cookies and `localStorage` into a JSON file. When a test loads that file via `storageState`, Playwright injects the saved cookies into the browser context before the first navigation — no login page, no form submission.

### `tests/ch04/auth.setup.ts` — the setup file

```ts
import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'
const TEST_USERNAME = 'e2e_test_user'
const TEST_EMAIL = 'e2e_test_user@example.com'
const TEST_PASSWORD = 'password123'

setup('authenticate', async ({ page }) => {
  // 1. Ensure the test account exists.
  const registerRes = await page.request.post('/api/auth/register', {
    data: { username: TEST_USERNAME, email: TEST_EMAIL, password: TEST_PASSWORD },
  })

  // 409 = account already exists — acceptable on subsequent runs.
  if (!registerRes.ok() && registerRes.status() !== 409) {
    throw new Error(`Registration failed: ${registerRes.status()}`)
  }

  // 2. Log in through the UI if the account already existed.
  if (registerRes.status() === 409) {
    await page.goto('/login')
    await page.getByLabel('Username').pressSequentially(TEST_USERNAME, { delay: 50 })
    await page.getByLabel('Password').pressSequentially(TEST_PASSWORD, { delay: 50 })
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/')
  } else {
    // Registration also logs the user in.
    await page.goto('/')
    await expect(page.getByText(`Hi, ${TEST_USERNAME}`, { exact: false })).toBeVisible()
  }

  // 3. Save the session cookie to a file.
  await page.context().storageState({ path: authFile })
})
```

`test as setup` aliases `test` to signal this is a setup step, not a regular test. The `409` branch handles the case where the account already exists on a subsequent run. `page.context().storageState({ path: authFile })` serialises the browser's cookies to `playwright/.auth/user.json`.

| Concept | Code | Meaning |
|---------|------|---------|
| `test as setup` | `import { test as setup } from '@playwright/test'` | Aliases `test` to signal this is a setup step |
| `storageState` (save) | `page.context().storageState({ path: '…' })` | Serialises cookies and localStorage to a JSON file |
| Idempotent setup | Handle 409 gracefully | The setup can run multiple times without failing |

---

### `tests/ch04/authenticated.spec.ts` — tests that use the saved session

```ts
import { test, expect } from '@playwright/test'

// Load the saved session — every test in this file starts already logged in.
test.use({ storageState: 'playwright/.auth/user.json' })

test('authenticated user sees their username in the navbar @smoke', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Hi, e2e_test_user', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cart/ })).toBeVisible()
})

test('authenticated user can access the cart page', async ({ page }) => {
  await page.goto('/cart')
  await expect(page).toHaveURL('/cart')
  await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible()
})

test('authenticated user can sign out', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign Out' }).click()
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()
  await expect(page.getByText('Hi, e2e_test_user', { exact: false })).not.toBeVisible()
})

test('authenticated user can add a product to the cart', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Auth Test Widget', description: 'A widget.', price: 9.99,
          image_url: 'https://placehold.co/400x300?text=Widget', category: 'Tools', stock: 10 },
      ]),
    })
  })

  await page.goto('/')
  const addButton = page.getByTestId('add-to-cart-1')
  await expect(addButton).toContainText('Add to Cart')
  await addButton.click()
  await expect(page.getByText('Added to cart!')).toBeVisible()
})
```

`test.use({ storageState: 'playwright/.auth/user.json' })` — this single line tells Playwright to load the saved session before every test. The tests contain no login logic — they go straight to the page they want to test.

| Concept | Code | Meaning |
|---------|------|---------|
| `test.use` | `test.use({ storageState: '…' })` | Applies a fixture override to every test in the file |
| `storageState` (load) | `{ storageState: 'playwright/.auth/user.json' }` | Injects saved cookies into the browser context before each test |
| `not.toBeVisible` | `expect(locator).not.toBeVisible()` | Asserts the element is absent or hidden |

---

### Updated `playwright.config.ts` — the setup project

```ts
projects: [
  // Runs auth.setup.ts once and saves the session file.
  { name: 'setup', testMatch: /auth\.setup\.ts/ },

  // Standard browser projects — run all spec files except authenticated.spec.ts.
  { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /authenticated\.spec\.ts/ },
  { name: 'firefox',  use: { ...devices['Desktop Firefox'] }, testIgnore: /authenticated\.spec\.ts/ },
  { name: 'webkit',   use: { ...devices['Desktop Safari'] }, testIgnore: /authenticated\.spec\.ts/ },

  // Authenticated browser projects — run only authenticated.spec.ts, after setup.
  {
    name: 'chromium-auth',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    testMatch: /authenticated\.spec\.ts/,
    dependencies: ['setup'],
  },
  {
    name: 'firefox-auth',
    use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' },
    testMatch: /authenticated\.spec\.ts/,
    dependencies: ['setup'],
  },
  {
    name: 'webkit-auth',
    use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' },
    testMatch: /authenticated\.spec\.ts/,
    dependencies: ['setup'],
  },
],
```

**How the project graph works:**

1. Playwright runs the `setup` project first (because the `*-auth` projects list it in `dependencies`).
2. `auth.setup.ts` registers the test user, logs in, and writes `playwright/.auth/user.json`.
3. The three `*-auth` projects run `authenticated.spec.ts` in parallel, each loading the saved session.
4. The three standard browser projects run all other spec files concurrently, ignoring `authenticated.spec.ts`.

| Concept | Code | Meaning |
|---------|------|---------|
| `dependencies` | `dependencies: ['setup']` | Ensures the named project runs first |
| `testMatch` | `testMatch: /pattern/` | Restricts a project to files matching the pattern |
| `testIgnore` | `testIgnore: /pattern/` | Excludes files matching the pattern from a project |

### The `playwright/.auth/` directory

Add this to `.gitignore` so developer sessions are never committed to version control:

```
playwright/.auth/
```

On CI, the setup project runs fresh on every build, generating a new session file before the authenticated tests start.

### When to use `storageState` vs. logging in per-test

| Approach | When to use |
|----------|-------------|
| **`storageState` (setup file)** | Tests that need an authenticated user but don't test the login flow itself |
| **Login per-test (`page.request` + UI)** | Tests that specifically test the login/register flow, or need a unique user per run |

---

## API Testing with the `request` Fixture

All the tests above use the `page` fixture — they open a real browser, navigate to a URL, and interact with the UI. But Playwright also ships a **standalone HTTP client** called the `request` fixture that lets you call API endpoints directly, without any browser overhead.

`page.request` was already used in `auth.spec.ts` to register a user before driving the login UI. The `request` fixture is different: it is a completely independent HTTP client with its own isolated cookie jar — no browser is launched at all.

The four tests in `tests/ch04/api.spec.ts` each demonstrate one core concept.

### Testing a public endpoint

```ts
// tests/ch04/api.spec.ts
test('GET /api/products returns a list of products with the expected shape', async ({ request }) => {
  const response = await request.get('/api/products')

  expect(response.status()).toBe(200)

  const products = await response.json()
  expect(Array.isArray(products)).toBe(true)
  expect(products.length).toBeGreaterThan(0)

  const first = products[0]
  expect(first).toHaveProperty('id')
  expect(first).toHaveProperty('name')
  expect(first).toHaveProperty('price')
  expect(first).toHaveProperty('category')
})
```

`request.get(url)` sends an HTTP GET and returns an `APIResponse`. `response.status()` reads the HTTP status code; `response.json()` parses the body. No browser is involved.

### Testing error responses

```ts
test('GET /api/products/:id returns 404 for a non-existent ID', async ({ request }) => {
  const response = await request.get('/api/products/999999')
  expect(response.status()).toBe(404)

  const body = await response.json()
  expect(body).toHaveProperty('error')
})
```

Testing error paths at the API level is faster and more precise than driving a browser to a broken URL.

### Cookie persistence — register → me → logout

The `request` fixture maintains a cookie jar for the lifetime of the test. A session cookie set by one call is automatically sent on the next call — exactly like a real HTTP client.

```ts
test('register sets a session cookie that /api/auth/me recognises', async ({ request }) => {
  const username = `api_user_${Date.now()}`

  // 1. Register — the server sets a session cookie in the response.
  const registerRes = await request.post('/api/auth/register', {
    data: { username, email: `${username}@example.com`, password: 'password123' },
  })
  expect(registerRes.status()).toBe(200)

  // 2. The cookie is sent automatically on the next call.
  const meBody = await (await request.get('/api/auth/me')).json()
  expect(meBody.isLoggedIn).toBe(true)
  expect(meBody.username).toBe(username)

  // 3. Logout clears the session.
  await request.post('/api/auth/logout')

  // 4. /api/auth/me now reports the user as logged out.
  const meAfterBody = await (await request.get('/api/auth/me')).json()
  expect(meAfterBody.isLoggedIn).toBe(false)
})
```

This is a **pure API integration test**: it verifies the register → session → logout lifecycle without opening a browser or rendering any UI.

### Authentication guard

Each test gets a fresh `request` context with no cookies, so protected endpoints return 401 without any extra setup:

```ts
test('GET /api/cart returns 401 without a session', async ({ request }) => {
  const response = await request.get('/api/cart')
  expect(response.status()).toBe(401)
})
```

### Key concepts

| Concept | Code | Meaning |
|---------|------|---------|
| `request` fixture | `async ({ request }) => { … }` | A standalone HTTP client — no browser, no cookies to start |
| `request.get` / `.post` | `request.get(url)`, `request.post(url, { data })` | Send GET / POST requests to the `baseURL` + path |
| `response.status()` | `expect(response.status()).toBe(200)` | Asserts the HTTP status code |
| `response.json()` | `await response.json()` | Parses the response body as JSON |
| `toHaveProperty` | `expect(obj).toHaveProperty('key')` | Asserts the object has the named property |
| Cookie persistence | Automatic within a test | The `request` fixture stores cookies and resends them on subsequent calls |

### When to use `request` vs. `page.route`

| Technique | What it does | When to use |
|-----------|-------------|-------------|
| `request` fixture | Calls the **real** API endpoint directly | Testing API contracts, status codes, session lifecycle |
| `page.route` + `route.fulfill` | **Intercepts** a browser request and returns fake data | Isolating the UI from the server; testing UI behaviour with controlled data |

---

## Summary

In this chapter you learned:

1. **Accessible locators** — `getByRole`, `getByLabel`, `getByText`, and `getByTestId` find elements the way users and screen readers do.
2. **URL and visibility assertions** — `toHaveURL`, `toBeVisible`, `toHaveCount`, and `not.toBeVisible`.
3. **Network interception** — `page.route` + `route.fulfill` mock API responses without changing server code.
4. **API calls from tests** — `page.request.post` registers users or performs setup without going through the browser UI.
5. **Test organisation** — `test.describe` and `test.beforeEach` group related tests and share setup.
6. **Session persistence** — `storageState` saves and restores session cookies so authenticated tests skip the login UI; a `setup` project in `playwright.config.ts` runs the login flow once before all authenticated tests.
7. **Direct API testing** — the `request` fixture is a standalone HTTP client that tests API endpoints without a browser; it maintains a cookie jar across calls within a test, enabling multi-step authenticated workflows.

**Next chapter:** [Playwright — Visual Regression Testing](./chapter-05-playwright-visual.md)

**Back to:** [Table of Contents](../README.md)
