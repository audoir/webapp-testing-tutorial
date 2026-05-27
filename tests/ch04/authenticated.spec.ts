import { test, expect } from '@playwright/test'

// ─── Authenticated Tests ──────────────────────────────────────────────────────
// These tests use the saved session state from tests/ch04/auth.setup.ts.
// The storageState option loads the session cookie that was saved by the setup
// project, so every test in this file starts already logged in as e2e_test_user.
//
// This is more efficient than logging in inside each test: the login flow runs
// once (in auth.setup.ts) and the resulting cookie is reused across all tests.

test.use({ storageState: 'playwright/.auth/user.json' })

// ─── Test 1 — Authenticated home page ────────────────────────────────────────
// Verifies that the navbar shows the logged-in greeting and the cart link when
// a session cookie is present.

test('authenticated user sees their username in the navbar @smoke', async ({ page }) => {
  await page.goto('/')

  // The Navbar fetches /api/auth/me on mount. With the session cookie loaded
  // from storageState, the server returns isLoggedIn: true and the username.
  await expect(page.getByText('Hi, e2e_test_user', { exact: false })).toBeVisible()

  // Authenticated users also see the Cart and My Orders links.
  await expect(page.getByRole('link', { name: /Cart/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'My Orders' })).toBeVisible()
})

// ─── Test 2 — Cart page is accessible when logged in ─────────────────────────
// Verifies that an authenticated user can reach /cart without being redirected.

test('authenticated user can access the cart page', async ({ page }) => {
  await page.goto('/cart')

  // An unauthenticated user would be redirected to /login.
  // With a valid session the cart page should load instead.
  await expect(page).toHaveURL('/cart')
  await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible()
})

// ─── Test 3 — Sign Out flow ───────────────────────────────────────────────────
// Verifies that clicking "Sign Out" logs the user out and returns them to the
// home page in the unauthenticated state.

test('authenticated user can sign out', async ({ page }) => {
  await page.goto('/')

  // Confirm we start logged in.
  await expect(page.getByText('Hi, e2e_test_user', { exact: false })).toBeVisible()

  // Click the Sign Out button in the navbar.
  await page.getByRole('button', { name: 'Sign Out' }).click()

  // After logout the navbar should show the Sign In link instead of the greeting.
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()
  await expect(page.getByText('Hi, e2e_test_user', { exact: false })).not.toBeVisible()
})

// ─── Test 4 — Add to cart ─────────────────────────────────────────────────────
// Verifies that an authenticated user can add a product to their cart.
// The products API is mocked so the test is deterministic.

test('authenticated user can add a product to the cart', async ({ page }) => {
  // Mock the products API to return a single known product.
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Auth Test Widget',
          description: 'A widget for authenticated testing.',
          price: 9.99,
          image_url: 'https://placehold.co/400x300?text=Widget',
          category: 'Tools',
          stock: 10,
        },
      ]),
    })
  })

  await page.goto('/')
  await expect(page.getByText('Auth Test Widget')).toBeVisible()

  // The "Add to Cart" button is only shown to authenticated users.
  // (Unauthenticated users see "Sign in to Buy" instead.)
  const addButton = page.getByTestId('add-to-cart-1')
  await expect(addButton).toBeVisible()
  await expect(addButton).toContainText('Add to Cart')

  // Click the button and wait for the success toast.
  await addButton.click()
  await expect(page.getByText('Added to cart!')).toBeVisible()
})
