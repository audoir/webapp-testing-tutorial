import { test as setup, expect } from '@playwright/test'

// ─── Authentication Setup ─────────────────────────────────────────────────────
// This file runs as a Playwright "setup" project before the authenticated tests.
// It registers a fixed test user (if they don't already exist), logs in through
// the UI, and saves the resulting session cookie to playwright/.auth/user.json.
//
// Any test file that declares:
//   test.use({ storageState: 'playwright/.auth/user.json' })
// will start with that session already active — no login step required.

const authFile = 'playwright/.auth/user.json'

// Fixed credentials for the shared test account.
// Using a static username means the account is created once and reused across
// runs (the register endpoint returns 409 if the user already exists, which we
// silently ignore).
const TEST_USERNAME = 'e2e_test_user'
const TEST_EMAIL = 'e2e_test_user@example.com'
const TEST_PASSWORD = 'password123'

setup('authenticate', async ({ page }) => {
  // 1. Ensure the test account exists.
  //    page.request shares the same cookie jar as the page, so the session
  //    cookie set by /api/auth/register is immediately available to the browser.
  const registerRes = await page.request.post('/api/auth/register', {
    data: {
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  })

  // 201 = created, 409 = already exists — both are acceptable.
  // Any other status is unexpected and should fail the setup.
  if (!registerRes.ok() && registerRes.status() !== 409) {
    throw new Error(
      `Registration failed with status ${registerRes.status()}: ${await registerRes.text()}`
    )
  }

  // 2. If the register call succeeded it also logs the user in (the API sets
  //    the session cookie). If the account already existed we need to log in
  //    explicitly through the UI.
  if (registerRes.status() === 409) {
    await page.goto('/login')
    await page.getByLabel('Username').pressSequentially(TEST_USERNAME, { delay: 50 })
    await page.getByLabel('Password').pressSequentially(TEST_PASSWORD, { delay: 50 })
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for the redirect to the home page to confirm login succeeded.
    await expect(page).toHaveURL('/')
    await expect(page.getByText(`Hi, ${TEST_USERNAME}`, { exact: false })).toBeVisible()
  } else {
    // Registration also logs the user in — navigate home to confirm.
    await page.goto('/')
    await expect(page.getByText(`Hi, ${TEST_USERNAME}`, { exact: false })).toBeVisible()
  }

  // 3. Save the browser's storage state (cookies + localStorage) to a file.
  //    Playwright will load this file in any test that uses storageState.
  await page.context().storageState({ path: authFile })
})
