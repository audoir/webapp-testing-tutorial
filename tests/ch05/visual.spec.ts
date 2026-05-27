import { test, expect } from '@playwright/test'

// ─── Visual Regression Testing ────────────────────────────────────────────────
// Playwright can capture screenshots and compare them against stored reference
// images. On the first run, reference images are created in
// tests/ch05/visual.spec.ts-snapshots/. On subsequent runs, the current
// screenshot is compared pixel-by-pixel against the reference. Any difference
// causes the test to fail, making it easy to catch unintended visual regressions.

// ─── Full-page screenshot ─────────────────────────────────────────────────────
// Demonstrates: capturing the entire page and comparing to a reference image

test('landing page matches visual snapshot @visual', async ({ page }) => {
  // Mock the products API so the snapshot is deterministic — the same products
  // appear on every run regardless of what is in the database.
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Widget Alpha',
          description: 'A reliable widget for everyday use.',
          price: 19.99,
          image_url: 'https://placehold.co/400x300?text=Alpha',
          category: 'Tools',
          stock: 10,
        },
        {
          id: 2,
          name: 'Widget Beta',
          description: 'An advanced widget with extra features.',
          price: 39.99,
          image_url: 'https://placehold.co/400x300?text=Beta',
          category: 'Tools',
          stock: 5,
        },
      ]),
    })
  })

  // Also mock /api/auth/me so the page always renders in the logged-out state,
  // keeping the snapshot consistent across test runs.
  await page.route('/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isLoggedIn: false }),
    })
  })

  await page.goto('/')

  // Wait until the product cards are visible before taking the screenshot.
  // This ensures we don't capture a loading state.
  await expect(page.locator('h1')).toContainText('Product Catalog')
  await expect(page.getByText('Widget Alpha')).toBeVisible()
  await expect(page.getByText('Widget Beta')).toBeVisible()

  // Wait for all images to finish loading so the screenshot is stable.
  // networkidle means no network requests have been made for at least 500 ms.
  await page.waitForLoadState('networkidle')

  // toHaveScreenshot saves a PNG in tests/ch05/visual.spec.ts-snapshots/ on the
  // first run and compares against it on every subsequent run.
  await expect(page).toHaveScreenshot('landing-page.png', {
    // Allow a small pixel tolerance to account for sub-pixel rendering
    // differences between runs (e.g. anti-aliasing, font hinting).
    maxDiffPixelRatio: 0.02,
  })
})

// ─── Component-level screenshot ───────────────────────────────────────────────
// Demonstrates: scoping a screenshot to a specific element rather than the
// whole page. This is useful for testing individual UI components in isolation.

test('product card matches visual snapshot @visual', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Snapshot Widget',
          description: 'Used for component-level visual testing.',
          price: 9.99,
          image_url: 'https://placehold.co/400x300?text=Snapshot',
          category: 'Tools',
          stock: 3,
        },
      ]),
    })
  })

  await page.route('/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isLoggedIn: false }),
    })
  })

  await page.goto('/')
  await expect(page.getByText('Snapshot Widget')).toBeVisible()

  // Wait for the card image to load before capturing the element screenshot.
  await page.waitForLoadState('networkidle')

  // Capture only the first product card, not the whole page.
  const card = page.locator('.bg-slate-800.rounded-xl').first()
  await expect(card).toBeVisible()

  await expect(card).toHaveScreenshot('product-card.png', {
    maxDiffPixelRatio: 0.02,
  })
})

// ─── Login page screenshot ────────────────────────────────────────────────────
// Demonstrates: capturing a static form page that has no dynamic content,
// making it an ideal candidate for visual regression testing.

test('login page matches visual snapshot @visual', async ({ page }) => {
  await page.goto('/login')

  // Wait for the heading to confirm the page has fully rendered.
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  await expect(page.getByLabel('Username')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()

  // The login page is static (no API calls), so networkidle is reached quickly.
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('login-page.png', {
    maxDiffPixelRatio: 0.02,
  })
})

// ─── Masking dynamic content ──────────────────────────────────────────────────
// Demonstrates: using the `mask` option to hide elements whose content changes
// between runs (e.g. timestamps, user-specific data, live prices). Masked
// regions are replaced with a solid rectangle in the comparison, so they never
// cause false failures.

test('navbar matches visual snapshot with dynamic content masked @visual', async ({ page }) => {
  // Simulate a logged-in user so the navbar shows the username and cart count.
  await page.route('/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isLoggedIn: true, username: 'testuser' }),
    })
  })

  await page.route('/api/cart', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], cartCount: 0 }),
    })
  })

  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.goto('/')

  const navbar = page.locator('nav')
  await expect(navbar).toBeVisible()

  // Wait for the auth state to be reflected in the navbar.
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()

  await page.waitForLoadState('networkidle')

  // Mask the greeting text ("Hi, testuser") because in a real app the username
  // would differ between test environments. The mask option accepts an array of
  // locators; each matched element is covered by a magenta rectangle in the diff.
  await expect(navbar).toHaveScreenshot('navbar-logged-in.png', {
    mask: [page.locator('span.text-slate-400')],
    maxDiffPixelRatio: 0.02,
  })
})

// ─── Mobile viewport screenshot ───────────────────────────────────────────────
// Demonstrates: combining setViewportSize with toHaveScreenshot to verify that
// the responsive layout looks correct at a mobile screen width.

test('landing page matches visual snapshot on mobile viewport @visual', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })

  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Mobile Widget',
          description: 'A widget for mobile visual testing.',
          price: 14.99,
          image_url: 'https://placehold.co/400x300?text=Mobile',
          category: 'Tools',
          stock: 7,
        },
      ]),
    })
  })

  await page.route('/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isLoggedIn: false }),
    })
  })

  await page.goto('/')
  await expect(page.getByText('Mobile Widget')).toBeVisible()

  // Wait for the product image to load before capturing the screenshot.
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('landing-page-mobile.png', {
    maxDiffPixelRatio: 0.02,
  })
})
