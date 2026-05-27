# Chapter 5 — Playwright: Visual Regression Testing

Visual regression testing captures screenshots of your application and compares them pixel-by-pixel against stored reference images. Any unintended change to the layout, colours, or typography causes the test to fail — an automatic safety net against accidental UI regressions.

---

## How It Works

Traditional assertions check *behaviour* — "does this element exist?", "does this text match?". Visual assertions check *appearance* — "does this page look exactly the same as it did before?".

| Approach | What it catches |
|----------|----------------|
| Behavioural assertions (`toBeVisible`, `toHaveText`, …) | Missing elements, wrong text, broken navigation |
| Visual assertions (`toHaveScreenshot`) | Layout shifts, colour changes, font regressions, CSS breakage |

Playwright's `toHaveScreenshot` works in two phases:

1. **First run (baseline creation)** — Playwright takes a screenshot and saves it as a reference PNG in `tests/ch05/visual.spec.ts-snapshots/`. The test always passes on the first run.
2. **Subsequent runs (comparison)** — Playwright takes a new screenshot and compares it pixel-by-pixel against the reference. If the images differ beyond a configurable threshold, the test fails and Playwright saves a diff image showing exactly what changed.

---

## `tests/ch05/visual.spec.ts`

All visual tests live in a dedicated file to keep them separate from behavioural E2E tests.

### Test 1 — Full-page screenshot

```ts
test('landing page matches visual snapshot @visual', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Widget Alpha', description: 'A reliable widget for everyday use.',
          price: 19.99, image_url: 'https://placehold.co/400x300?text=Alpha', category: 'Tools', stock: 10 },
        { id: 2, name: 'Widget Beta', description: 'An advanced widget with extra features.',
          price: 39.99, image_url: 'https://placehold.co/400x300?text=Beta', category: 'Tools', stock: 5 },
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
  await expect(page.locator('h1')).toContainText('Product Catalog')
  await expect(page.getByText('Widget Alpha')).toBeVisible()

  await expect(page).toHaveScreenshot('landing-page.png')
})
```

Both `/api/products` and `/api/auth/me` are mocked before `page.goto`. This is essential — if the screenshot includes real database data, it will differ between environments and test runs, causing false failures.

`await expect(page).toHaveScreenshot('landing-page.png')` captures the full browser viewport and saves it as `tests/ch05/visual.spec.ts-snapshots/landing-page-chromium-darwin.png` (the browser name and OS are appended automatically).

---

### Test 2 — Component-level screenshot

```ts
test('product card matches visual snapshot @visual', async ({ page }) => {
  // ... mock setup ...

  await page.goto('/')
  await expect(page.getByText('Snapshot Widget')).toBeVisible()

  // Capture only the first product card, not the whole page.
  const card = page.locator('.bg-slate-800.rounded-xl').first()
  await expect(card).toHaveScreenshot('product-card.png')
})
```

Instead of passing `page` to `toHaveScreenshot`, we pass a **locator**. Playwright crops the screenshot to the bounding box of the matched element. Component-level screenshots are more focused: a change to the navbar won't break a product-card snapshot, and vice versa.

---

### Test 3 — Masking dynamic content

```ts
test('navbar matches visual snapshot with dynamic content masked @visual', async ({ page }) => {
  await page.route('/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isLoggedIn: true, username: 'testuser' }),
    })
  })
  // ... other mocks ...

  await page.goto('/')
  const navbar = page.locator('nav')
  await expect(navbar).toBeVisible()

  await expect(navbar).toHaveScreenshot('navbar-logged-in.png', {
    mask: [page.locator('span.text-slate-400')],
  })
})
```

The `mask` option accepts an array of locators. Each matched element is replaced with a solid magenta rectangle in both the reference and the comparison screenshot, so its content is never compared. Here, `span.text-slate-400` targets the "Hi, testuser" greeting — masking it prevents false failures when the username differs between environments.

---

### Test 4 — Mobile viewport screenshot

```ts
test('landing page matches visual snapshot on mobile viewport @visual', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })

  // ... mock setup ...

  await page.goto('/')
  await expect(page.getByText('Mobile Widget')).toBeVisible()

  await expect(page).toHaveScreenshot('landing-page-mobile.png')
})
```

`page.setViewportSize` is called *before* `page.goto`, so the browser renders the page at 375 × 667 px (iPhone SE dimensions) from the start. The snapshot verifies that the responsive grid collapses correctly on narrow screens.

---

## Key Concepts

| Concept | Code | Meaning |
|---------|------|---------|
| `toHaveScreenshot` (page) | `await expect(page).toHaveScreenshot('name.png')` | Captures the full viewport and compares to the reference PNG |
| `toHaveScreenshot` (locator) | `await expect(locator).toHaveScreenshot('name.png')` | Captures only the element's bounding box |
| `mask` option | `{ mask: [locator] }` | Replaces matched elements with a solid rectangle before comparing |
| `maxDiffPixelRatio` | `{ maxDiffPixelRatio: 0.02 }` | Allows up to 2% of pixels to differ (absorbs sub-pixel rendering differences) |
| Snapshot directory | `tests/ch05/visual.spec.ts-snapshots/` | Where reference PNGs are stored |
| `--update-snapshots` | `npx playwright test --update-snapshots` | Regenerates all reference images after intentional UI changes |

---

## Stabilising Visual Tests

Visual tests are more prone to flakiness than behavioural tests because they are sensitive to timing. Three techniques eliminate most of this:

**1. Wait for key elements before snapshotting** — assert that the content you care about is visible *before* calling `toHaveScreenshot`:

```ts
await expect(page.locator('h1')).toContainText('Product Catalog')
await expect(page.getByText('Widget Alpha')).toBeVisible()
await expect(page).toHaveScreenshot('landing-page.png')
```

**2. Wait for `networkidle`** — blocks until no network requests have been made for at least 500 ms, ensuring images and fonts have finished loading:

```ts
await page.waitForLoadState('networkidle')
await expect(page).toHaveScreenshot('landing-page.png')
```

**3. Allow a small pixel tolerance** — sub-pixel rendering differences (anti-aliasing, font hinting) can cause a handful of pixels to differ even when the page looks identical:

```ts
await expect(page).toHaveScreenshot('landing-page.png', { maxDiffPixelRatio: 0.02 })
```

---

## Snapshot File Naming

Playwright appends the browser name and OS to every snapshot filename:

```
tests/ch05/visual.spec.ts-snapshots/
├── landing-page-chromium-darwin.png
├── landing-page-firefox-darwin.png
├── landing-page-webkit-darwin.png
├── product-card-chromium-darwin.png
├── navbar-logged-in-chromium-darwin.png
└── landing-page-mobile-chromium-darwin.png
```

All of these files should be committed to version control in real projects. In this tutorial repo they are `.gitignore`d so each learner generates their own on first run.

---

## Running Visual Tests


```bash
# Run all visual tests (creates snapshots on first run)
npx playwright test tests/ch05/visual.spec.ts

# Run only on Chromium to speed up snapshot creation
npx playwright test tests/ch05/visual.spec.ts --project=chromium

# Update reference snapshots after an intentional UI change
npx playwright test tests/ch05/visual.spec.ts --update-snapshots
```

When a visual regression is detected:

```
  ✗  [chromium] › tests/ch05/visual.spec.ts:13:1 › landing page matches visual snapshot (1.6s)

    Error: Screenshot comparison failed:
      1234 pixels (0.48%) are different.
    Expected: tests/ch05/visual.spec.ts-snapshots/landing-page-chromium-darwin.png
    Received: test-results/…/landing-page-actual.png
    Diff:     test-results/…/landing-page-diff.png
```

Open the HTML report (`npx playwright show-report`) to see the expected, actual, and diff images side by side.

---

## Automatic Snapshot Generation on First Run

The `test:playwright` script handles baseline creation automatically:

```json
"test:playwright": "node -e \"const{existsSync}=require('fs');if(!existsSync('tests/ch05/visual.spec.ts-snapshots')){const{execSync}=require('child_process');execSync('npx playwright test tests/ch05/visual.spec.ts --update-snapshots',{stdio:'inherit'})}\" && playwright test"
```

Before running the full suite it checks whether `tests/ch05/visual.spec.ts-snapshots/` exists. If not (first run on a fresh checkout), it generates the baseline images, then proceeds with the normal test run. On all subsequent runs the directory already exists and the step is skipped.

To regenerate snapshots manually after an intentional UI change:

```bash
npx playwright test tests/ch05/visual.spec.ts --update-snapshots
```

---

## Generating a Test with Playwright Codegen

Before writing a visual test by hand, it helps to let Playwright record the navigation and interaction steps for you. The `codegen` command opens a live browser alongside the **Playwright Inspector** window, records every action you perform, and outputs ready-to-use TypeScript code that you can paste directly into your test file.

### Launching Codegen

Start the app (`npm run dev`), then in a second terminal run:

```bash
npx playwright codegen http://localhost:3000
```

Two windows open:

- **Browser window** — a real Chromium instance pointed at your app. Everything you click, type, or navigate to is recorded.
- **Playwright Inspector** — shows the generated code updating in real time as you interact with the browser.

### Recording the Navigation Steps

1. The browser lands on the home page. The Inspector immediately generates `await page.goto('http://localhost:3000/')`.
2. Click on a product card. The Inspector adds a `page.click(…)` line with the best available locator (role, text, or test-id — whichever is most resilient).
3. Navigate back, or click any other element you want to include in the test.

At any point you can add **assertions** without writing code:

- Click the **Assert visibility** button in the Inspector toolbar, then click an element in the browser — the Inspector inserts `await expect(locator).toBeVisible()`.
- Use **Assert text** to generate `await expect(locator).toHaveText(…)`.
- Use **Assert value** to generate `await expect(locator).toHaveValue(…)`.

### Copying the Generated Code

When you are happy with the recorded steps, click **Copy** in the Inspector toolbar. The full test — including `import` statements — is copied to your clipboard. Paste it into `tests/ch05/visual.spec.ts` (or a new file).

> **Tip:** Codegen records against a live server, so the page will contain real data. Before committing the test, add `page.route` mocks (as shown in the examples above) so that snapshots are deterministic across environments.

### Picking Locators Without Recording

If you only need a locator for an element (for example, to scope a component-level snapshot), you can use the **Pick Locator** feature without recording a full test:

1. Click the **Record** button in the Inspector to stop recording.
2. Click **Pick Locator**.
3. Hover over any element in the browser — the Inspector highlights it and shows the suggested locator beneath it.
4. Click the element to lock in the locator, then copy it from the Inspector field and paste it into your test.

### Generating Tests in VS Code

If you have the [Playwright VS Code extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) installed, you can record tests without leaving the editor:

1. Open the **Testing** sidebar (the beaker icon).
2. Click **Record new** — a browser window opens and a new `test-1.spec.ts` file is created.
3. Interact with the app; the generated code appears live in the file.
4. Click **Cancel** (or close the browser) to stop recording, then rename and edit the file as needed.

You can also use **Record at cursor** to insert new recorded actions at a specific point inside an existing test — useful for extending a visual test with additional navigation steps before the `toHaveScreenshot` call.

---

## Best Practices

- **Mock all API calls** — use `page.route` to return fixed data so snapshots are deterministic.
- **Wait for content to load** — assert that key elements are visible before calling `toHaveScreenshot`.
- **Wait for `networkidle`** — ensures images and fonts have finished loading.
- **Set `maxDiffPixelRatio`** — allow a small tolerance to absorb sub-pixel rendering differences.
- **Mask dynamic content** — use the `mask` option for timestamps, usernames, or any value that legitimately changes between runs.
- **Prefer component-level snapshots** — scoping screenshots to individual components reduces noise and makes failures easier to diagnose.
- **Run `--update-snapshots` deliberately** — only update references after reviewing the visual diff and confirming the change is intentional.

---

## Summary

In this chapter you learned:

1. **What visual regression testing is** — pixel-by-pixel screenshot comparison that catches layout, colour, and CSS regressions.
2. **How `toHaveScreenshot` works** — baseline creation on first run, comparison on subsequent runs.
3. **Full-page vs. component-level snapshots** — scoping to a locator reduces noise.
4. **Masking dynamic content** — the `mask` option hides values that legitimately change between runs.
5. **Stabilising techniques** — wait for elements, wait for `networkidle`, and set `maxDiffPixelRatio`.
6. **Updating baselines** — use `--update-snapshots` after intentional UI changes.

**Next chapter:** [E2E and Component Testing with Cypress](./chapter-06-cypress.md)

**Back to:** [Table of Contents](../README.md)