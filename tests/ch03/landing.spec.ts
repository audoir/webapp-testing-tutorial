import { test, expect } from '@playwright/test'

test('landing page has a heading @smoke', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/')
  // The page should contain an h1 with "Product Catalog"
  await expect(page.locator('h1')).toContainText('Product Catalog')
})
