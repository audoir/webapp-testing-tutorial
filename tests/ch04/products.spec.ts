import { test, expect } from '@playwright/test'

// ─── API route mocking ────────────────────────────────────────────────────────
// Demonstrates: page.route to intercept a network request and return fake data

test('product catalog renders items returned by the API', async ({ page }) => {
  // Intercept the products API and return a single fake product
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 99,
          name: 'Test Widget',
          description: 'A widget for testing.',
          price: 9.99,
          image_url: 'https://placehold.co/400x300?text=Widget',
          category: 'Test',
          stock: 10,
        },
      ]),
    })
  })

  await page.goto('/')
  await expect(page.getByText('Test Widget')).toBeVisible()
  await expect(page.getByText('$9.99')).toBeVisible()
})

// ─── getByTestId ──────────────────────────────────────────────────────────────
// Demonstrates: targeting an element by its data-testid attribute
// The button in app/page.tsx has data-testid={`add-to-cart-${product.id}`}

test('add-to-cart button is present for each product', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Widget A',
          description: '',
          price: 9.99,
          image_url: 'https://placehold.co/400x300?text=Widget',
          category: 'Tools',
          stock: 5,
        },
      ]),
    })
  })

  await page.goto('/')
  await expect(page.getByTestId('add-to-cart-1')).toBeVisible()
})

// ─── toHaveCount / .first() / .nth() ─────────────────────────────────────────
// Demonstrates: asserting on a list of matched elements

test('product catalog shows one card per product', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Widget A', description: '', price: 9.99,  image_url: null, category: 'Tools', stock: 5 },
        { id: 2, name: 'Widget B', description: '', price: 19.99, image_url: null, category: 'Tools', stock: 3 },
        { id: 3, name: 'Widget C', description: '', price: 29.99, image_url: null, category: 'Tools', stock: 1 },
      ]),
    })
  })

  await page.goto('/')

  // Each product renders an <h3> with the product name
  const productNames = page.locator('h3')
  await expect(productNames).toHaveCount(3)

  // Assert specific items by index
  await expect(productNames.first()).toContainText('Widget A')
  await expect(productNames.nth(1)).toContainText('Widget B')
  await expect(productNames.nth(2)).toContainText('Widget C')
})
