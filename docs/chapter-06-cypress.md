# Chapter 6 — E2E and Component Testing with Cypress

## What is Cypress?

[Cypress](https://www.cypress.io/) is a test runner built specifically for the web. It runs directly inside the browser — not in a separate process communicating with the browser over a protocol — which gives it unique capabilities: real-time reloading, time-travel debugging, and automatic waiting without any explicit `await` calls.

Cypress supports two distinct testing modes:

| Mode | What it tests |
|------|--------------|
| **E2E Testing** | Full user journeys against a running Next.js server, just like Playwright |
| **Component Testing** | Individual React components in isolation, mounted directly in the browser |

### How does Cypress compare to Playwright and Jest/RTL?

| Tool | What it tests | Speed | Isolation |
|------|--------------|-------|-----------|
| Jest | Pure functions, API logic | Very fast | Full (mocked dependencies) |
| React Testing Library | Component rendering & interaction | Fast | High (mocked network & router) |
| Playwright | Full user journeys in a real browser | Slow | None (real server & browser) |
| Cypress E2E | Full user journeys in a real browser | Slow | None (real server & browser) |
| Cypress Component | Single component in a real browser | Medium | High (no server needed) |

The key difference between Cypress and Playwright for E2E testing is **architecture**: Playwright controls the browser from Node.js via the Chrome DevTools Protocol, while Cypress runs its test code *inside* the browser alongside your application. This makes Cypress feel more interactive and gives it direct access to the DOM without any serialisation overhead.

Cypress Component Testing is a compelling alternative to React Testing Library: instead of a simulated jsdom environment, your component renders in a real browser, so CSS, layout, and browser-specific behaviour are all exercised.

---

## Project Setup

### Installation

Cypress was installed as a dev dependency:

```bash
npm install --save-dev cypress
```

This installs the `cypress` package (v15+), which includes both the interactive GUI and the headless CLI runner.

### `cypress.config.ts`

```ts
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {},
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
})
```

Key settings explained:

| Setting | Value | Meaning |
|---------|-------|---------|
| `e2e.baseUrl` | `'http://localhost:3000'` | Allows `cy.visit('/')` instead of the full URL |
| `e2e.specPattern` | `'cypress/e2e/**/*.cy.{ts,tsx}'` | Cypress looks for E2E tests in `cypress/e2e/` |
| `e2e.supportFile` | `'cypress/support/e2e.ts'` | Loaded before every E2E test; place global hooks here |
| `component.devServer.framework` | `'next'` | Tells Cypress to use Next.js's webpack config for component tests |
| `component.devServer.bundler` | `'webpack'` | The bundler Cypress uses to compile components |
| `component.specPattern` | `'cypress/component/**/*.cy.{ts,tsx}'` | Cypress looks for component tests in `cypress/component/` |
| `component.supportFile` | `'cypress/support/component.ts'` | Loaded before every component test; registers `cy.mount` |
| `component.indexHtmlFile` | `'cypress/support/component-index.html'` | HTML template used for mounting components during component tests |

### Support files

**`cypress/support/e2e.ts`** — loaded automatically before every E2E test. Currently empty, but this is where you would add global `beforeEach` hooks or custom commands (e.g. `cy.login()`).

**`cypress/support/component.ts`** — loaded automatically before every component test. It registers the `cy.mount` command, which is required for component testing:

```ts
import { mount } from 'cypress/react'

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', mount)
```

**`cypress/support/component-index.html`** — the HTML template used for component testing. This file provides the base HTML document where your React components are mounted during component tests:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Components App</title>
  </head>
  <body>
    <div data-cy-root></div>
  </body>
</html>
```

The `<div data-cy-root></div>` element is where Cypress mounts your components when you call `cy.mount()`. You can customize this file to include global CSS, fonts, or other assets that your components need during testing.

### `package.json` — scripts

```json
"scripts": {
  "cypress:open":          "cypress open",
  "cypress:run":           "cypress run",
  "test:cypress:e2e":      "cypress run --e2e",
  "test:cypress:component": "cypress run --component"
}
```

| Script | Purpose |
|--------|---------|
| `cypress:open` | Opens the interactive Cypress GUI (choose E2E or Component) |
| `cypress:run` | Runs all Cypress tests headlessly |
| `test:cypress:e2e` | Runs only E2E tests headlessly |
| `test:cypress:component` | Runs only component tests headlessly |

### File structure

```
cypress/
├── e2e/
│   └── ch06/
│       └── landing.cy.ts       ← Chapter 6: first E2E test
├── component/
│   └── ch06/
│       └── page.cy.tsx         ← Chapter 6: first component test
└── support/
    ├── e2e.ts                  ← Global E2E hooks / custom commands
    └── component.ts            ← Registers cy.mount for component tests
```

---

## Your First Cypress E2E Test — `cypress/e2e/ch06/landing.cy.ts`

The home page (`app/page.tsx`) renders an `<h1>` with the text "Product Catalog" once products have loaded from the API. It also renders a product card for every product, each with a `data-testid` of `add-to-cart-{id}`. When no user is logged in, the button text reads "Sign in to Buy".

```ts
describe('Landing page', () => {
  it('has a Product Catalog heading', () => {
    cy.visit('/')
    cy.get('h1').contains('Product Catalog')
  })

  it('displays product cards', () => {
    cy.visit('/')
    // Wait for products to load (the loading state disappears)
    cy.contains('Loading products...').should('not.exist')
    // At least one product card should be visible
    cy.get('[data-testid^="add-to-cart-"]').should('have.length.greaterThan', 0)
  })

  it('shows Sign in to Buy button when not logged in', () => {
    cy.visit('/')
    cy.contains('Loading products...').should('not.exist')
    cy.contains('Sign in to Buy').should('be.visible')
  })
})
```

### Key concepts

| Concept | Code | Meaning |
|---------|------|---------|
| **`describe`** | `describe('Landing page', () => { … })` | Groups related tests under a shared label |
| **`it`** | `it('has a heading', () => { … })` | Defines a single test case |
| **`cy.visit`** | `cy.visit('/')` | Navigates the browser to `baseUrl + '/'` |
| **`cy.get`** | `cy.get('h1')` | Queries the DOM using a CSS selector |
| **`cy.contains`** | `cy.contains('Product Catalog')` | Finds an element containing the given text |
| **`.should`** | `.should('be.visible')` | Asserts a condition on the matched element(s) |
| **Attribute selector** | `[data-testid^="add-to-cart-"]` | Matches elements whose `data-testid` starts with the given prefix |

### Auto-waiting

Cypress automatically retries queries and assertions until they pass or the default timeout (4 seconds) expires. When the test calls `cy.contains('Loading products...').should('not.exist')`, Cypress keeps checking until the loading text disappears — no manual `waitFor` or `sleep` is needed.

This is the same principle as Playwright's auto-wait, but implemented differently: Cypress re-runs the entire command chain from the browser's event loop rather than polling from Node.js.

---

## Your First Cypress Component Test — `cypress/component/ch06/page.cy.tsx`

Component tests mount a single React component directly in the browser without starting a Next.js server. This is ideal for testing UI logic and appearance in isolation.

### The App Router problem — and how to fix it

Components that call Next.js App Router hooks (`useRouter`, `usePathname`, etc.) at render time throw `"invariant expected app router to be mounted"` when mounted outside a full Next.js context. The fix is to wrap the component in `AppRouterContext.Provider` with a minimal mock router — this is the same pattern used in the official Next.js test examples.

The test targets the `Navbar` component (`components/Navbar.tsx`), which uses both `useRouter` and `usePathname`. We provide a mock router via `AppRouterContext.Provider` and stub the API calls with `cy.intercept`:

```tsx
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import Navbar from '../../../components/Navbar'
import { CartProvider } from '../../../context/CartContext'

// Minimal mock of the Next.js App Router
const mockRouter = {
  back: () => {},
  forward: () => {},
  push: () => {},
  replace: () => {},
  refresh: () => {},
  prefetch: () => {},
  hmrRefresh: () => {},
}

function withAppRouter(component: React.ReactNode) {
  return (
    <AppRouterContext.Provider value={mockRouter as any}>
      <CartProvider>
        {component}
      </CartProvider>
    </AppRouterContext.Provider>
  )
}

describe('<Navbar />', () => {
  beforeEach(() => {
    // Stub the auth and cart API calls made by Navbar on mount
    cy.intercept('GET', '/api/auth/me', { isLoggedIn: false }).as('authMe')
    cy.intercept('GET', '/api/cart', { items: [] }).as('cart')
  })

  it('renders the brand link', () => {
    cy.mount(withAppRouter(<Navbar />))
    cy.get('a').contains('ShopNext').should('be.visible')
  })

  it('renders the Products navigation link', () => {
    cy.mount(withAppRouter(<Navbar />))
    cy.get('a').contains('Products').should('be.visible')
  })

  it('renders Sign In and Register links when logged out', () => {
    cy.mount(withAppRouter(<Navbar />))
    cy.wait('@authMe')
    cy.contains('Sign In').should('be.visible')
    cy.contains('Register').should('be.visible')
  })
})
```

### Key concepts

| Concept | Code | Meaning |
|---------|------|---------|
| **`cy.mount`** | `cy.mount(withAppRouter(<Navbar />))` | Mounts the React component into a real browser DOM |
| **`AppRouterContext.Provider`** | `<AppRouterContext.Provider value={mockRouter}>` | Provides a fake router so `useRouter`/`usePathname` don't throw |
| **`cy.intercept`** | `cy.intercept('GET', '/api/auth/me', …)` | Stubs network requests so no server is needed |
| **No server needed** | — | Component tests do not require `npm run start`; Cypress bundles the component with webpack |
| **Real browser** | — | Unlike jsdom (Jest/RTL), the component renders in an actual Chromium/Firefox/WebKit tab |

### Component tests vs React Testing Library

| Aspect | Cypress Component | React Testing Library |
|--------|------------------|-----------------------|
| Environment | Real browser | jsdom (simulated) |
| CSS & layout | Fully rendered | Not rendered |
| Speed | Medium (browser startup) | Fast |
| Network | No server; can stub `cy.intercept` | Mocked with `msw` or `jest.fn` |
| Async | Auto-wait | `waitFor` / `findBy*` |

> **Good to know:** Cypress currently does not support component testing for `async` Server Components. Use E2E testing for those.

---

## Running the Tests

### E2E tests (requires a running server)

Build and start the production server first, then open Cypress:

```bash
# Terminal 1 — build and start the server
npm run build && npm run start

# Terminal 2 — open the interactive Cypress GUI
npm run cypress:open
```

Or run headlessly in one step using `start-server-and-test` (see CI section below):

```bash
npm run test:cypress:e2e
```

> **Note:** Unlike Playwright, Cypress does not have a built-in `webServer` option that auto-starts Next.js. You must start the server separately, or use the `start-server-and-test` package.

### Component tests (no server needed)

```bash
# Interactive GUI
npm run cypress:open
# — then select "Component Testing" in the Cypress app

# Headless
npm run test:cypress:component
```

### Useful CLI commands

```bash
# Open the interactive GUI (choose E2E or Component)
npx cypress open

# Run all tests headlessly
npx cypress run

# Run only E2E tests
npx cypress run --e2e

# Run only component tests
npx cypress run --component

# Run a specific spec file
npx cypress run --spec "cypress/e2e/ch06/landing.cy.ts"

# Run in a specific browser
npx cypress run --browser firefox
```

---

## Continuous Integration (CI)

For CI environments, install the `start-server-and-test` package to automatically start the Next.js server before running E2E tests:

```bash
npm install --save-dev start-server-and-test
```

Then add these scripts to `package.json`:

```json
"scripts": {
  "e2e":                "start-server-and-test start http://localhost:3000 \"cypress open --e2e\"",
  "e2e:headless":       "start-server-and-test start http://localhost:3000 \"cypress run --e2e\"",
  "component":          "cypress open --component",
  "component:headless": "cypress run --component"
}
```

On CI, run:

```bash
# E2E (headless, auto-starts server)
npm run e2e:headless

# Component (headless, no server needed)
npm run component:headless
```

---

## Summary

In this chapter you learned:

1. **What Cypress is** — a browser-native test runner supporting both E2E and component testing.
2. **How it differs from Playwright** — Cypress runs inside the browser; Playwright controls the browser from Node.js. Both are valid for E2E; Cypress also offers component testing as a first-class feature.
3. **How to configure it** — `cypress.config.ts` sets the `baseUrl`, `specPattern`, and `devServer` for component tests; support files register `cy.mount` and global hooks.
4. **How to write an E2E test** — `describe`, `it`, `cy.visit`, `cy.get`, `cy.contains`, and `.should` assertions with automatic retrying.
5. **How to write a component test** — `cy.mount` renders a React component in a real browser without a server; assertions work identically to E2E tests.
6. **How to run tests** — `npm run cypress:open` for the interactive GUI; `npm run test:cypress:e2e` and `npm run test:cypress:component` for headless runs.

**Next chapter:** [Playwright vs Cypress: A Deep Dive](./chapter-07-playwright-vs-cypress.md)

**Back to:** [Table of Contents](../README.md)
