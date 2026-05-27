import { test, expect } from '@playwright/test'

// ─── Navigation ───────────────────────────────────────────────────────────────
// Demonstrates: page.getByRole, URL assertion, clicking links

test('clicking "Sign In" in the navbar navigates to /login @smoke', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
})

// ─── Protected route redirect ─────────────────────────────────────────────────
// Demonstrates: asserting that an unauthenticated user is redirected

test('visiting /cart without being logged in redirects to /login', async ({ page }) => {
  await page.goto('/cart')
  await expect(page).toHaveURL('/login')
})

// ─── Full login flow ──────────────────────────────────────────────────────────
// Demonstrates: a multi-step user journey using the real server

test('a registered user can log in and see their username in the navbar', async ({ page }) => {
  // Register a fresh account via the API so the test is self-contained
  const username = `user_${Date.now()}`
  await page.request.post('/api/auth/register', {
    data: { username, email: `${username}@example.com`, password: 'password123' },
  })

  // The register API automatically logs the user in (sets a session cookie).
  // We must log out first so the test can verify the full login flow from scratch.
  await page.request.post('/api/auth/logout')

  // Log in through the UI
  await page.goto('/login')
  await page.getByLabel('Username').pressSequentially(username, { delay: 50 })
  await page.getByLabel('Password').pressSequentially('password123', { delay: 50 })
  await page.getByRole('button', { name: 'Sign In' }).click()

  // After login the app redirects to / and shows the username in the navbar
  await expect(page).toHaveURL('/')
  await expect(page.getByText(`Hi, ${username}`, { exact: false })).toBeVisible()
})

// ─── describe / beforeEach ────────────────────────────────────────────────────
// Demonstrates: grouping related tests and sharing setup with test.beforeEach
//
// The two login-form tests both start on /login, so we wrap them in a
// describe block and navigate once in beforeEach instead of repeating
// page.goto('/login') in every test body.
//
// Demonstrates: getByLabel — the login form's <label> elements are linked
// to their <input> elements via htmlFor/id, so getByLabel() can match them.

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
