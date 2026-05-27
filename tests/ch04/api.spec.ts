import { test, expect } from '@playwright/test'

// ─── API Testing with the `request` fixture ───────────────────────────────────
//
// The `request` fixture is a standalone APIRequestContext that is NOT tied to
// any browser page. It has no cookies, no session, and no browser overhead —
// it is a pure HTTP client. This makes it ideal for testing API endpoints
// directly, without going through the browser UI.
//
// Contrast with `page.request`, which shares the page's cookie jar and is used
// when you need the API call to carry the same session as the browser.

// ─── 1. Testing a public endpoint ────────────────────────────────────────────
// Demonstrates: request.get, response.status(), response.json(), toHaveProperty

test('GET /api/products returns a list of products with the expected shape', async ({ request }) => {
  const response = await request.get('/api/products')

  expect(response.status()).toBe(200)

  const products = await response.json()
  expect(Array.isArray(products)).toBe(true)
  expect(products.length).toBeGreaterThan(0)

  // Assert the shape every product must have.
  const first = products[0]
  expect(first).toHaveProperty('id')
  expect(first).toHaveProperty('name')
  expect(first).toHaveProperty('price')
  expect(first).toHaveProperty('category')
})

// ─── 2. Testing error responses ───────────────────────────────────────────────
// Demonstrates: asserting 4xx status codes and error body shape

test('GET /api/products/:id returns 404 for a non-existent ID', async ({ request }) => {
  const response = await request.get('/api/products/999999')
  expect(response.status()).toBe(404)

  const body = await response.json()
  expect(body).toHaveProperty('error')
})

// ─── 3. Cookie persistence — register → me → logout ──────────────────────────
// Demonstrates: request.post, cookie jar shared across calls within a test,
// multi-step API flow without a browser

test('register sets a session cookie that /api/auth/me recognises', async ({ request }) => {
  const username = `api_user_${Date.now()}`

  // 1. Register — the server sets a session cookie in the response.
  const registerRes = await request.post('/api/auth/register', {
    data: { username, email: `${username}@example.com`, password: 'password123' },
  })
  expect(registerRes.status()).toBe(200)

  // 2. The cookie is sent automatically on the next call.
  const meRes = await request.get('/api/auth/me')
  const meBody = await meRes.json()
  expect(meBody.isLoggedIn).toBe(true)
  expect(meBody.username).toBe(username)

  // 3. Logout clears the session.
  await request.post('/api/auth/logout')

  // 4. /api/auth/me now reports the user as logged out.
  const meAfterBody = await (await request.get('/api/auth/me')).json()
  expect(meAfterBody.isLoggedIn).toBe(false)
})

// ─── 4. Authentication guard ──────────────────────────────────────────────────
// Demonstrates: each `request` fixture starts with no cookies, so protected
// endpoints return 401 without any extra setup

test('GET /api/cart returns 401 without a session', async ({ request }) => {
  const response = await request.get('/api/cart')
  expect(response.status()).toBe(401)
})
