# The Complete Guide to Web Application Testing

A hands-on tutorial for learning webapp testing using **Jest**, **React Testing Library**, **Playwright**, and **Cypress**. The subject application is a simple full-stack online store (Next.js + SQLite) that serves as a realistic CRUD app to test against.

---

## Testing Chapters

| Chapter | Topic | File |
|---------|-------|------|
| 1 | Unit Testing with Jest | [docs/chapter-01-jest.md](docs/chapter-01-jest.md) |
| 2 | Component Testing with React Testing Library | [docs/chapter-02-rtl.md](docs/chapter-02-rtl.md) |
| 3 | End-to-End Testing with Playwright | [docs/chapter-03-playwright.md](docs/chapter-03-playwright.md) |
| 4 | Playwright — Locators, Network Interception, Auth Flows & API Testing | [docs/chapter-04-playwright-advanced.md](docs/chapter-04-playwright-advanced.md) |
| 5 | Playwright — Visual Regression Testing, Codegen | [docs/chapter-05-playwright-visual.md](docs/chapter-05-playwright-visual.md) |
| 6 | E2E and Component Testing with Cypress | [docs/chapter-06-cypress.md](docs/chapter-06-cypress.md) |
| 7 | Playwright vs Cypress: A Deep Dive | [docs/chapter-07-playwright-vs-cypress.md](docs/chapter-07-playwright-vs-cypress.md) |
| 8 | Playwright vs Selenium: Why You Should Choose Playwright | [docs/chapter-08-playwright-vs-selenium.md](docs/chapter-08-playwright-vs-selenium.md) |
| 9 | Test-Driven Development in Web Apps | [docs/chapter-09-tdd.md](docs/chapter-09-tdd.md) |

---

## Testing Tool Comparison

The tools covered in this tutorial serve different purposes and complement each other. Use this table to decide which tool is right for a given situation.

| | **Jest** | **React Testing Library (RTL)** | **Playwright** | **Cypress** | **Selenium** |
|---|---|---|---|---|---|
| **What it tests** | Pure functions, utilities, API route logic | React component rendering & user interaction | Full user journeys in a real browser | Full user journeys in a real browser (E2E); individual React components in a real browser (Component) | Full user journeys in a real browser |
| **Runs in** | Node.js (no browser) | Node.js with jsdom (simulated DOM) | Real browser (Chromium, Firefox, WebKit) | Real browser (Chromium, Firefox, WebKit) | Real browser (Chrome, Firefox, Safari, Edge, IE, Opera) |
| **Speed** | ⚡ Very fast (milliseconds per test) | ⚡ Fast (milliseconds per test) | 🐢 Slow (seconds per test; browser startup overhead) | 🐢 Slow for E2E; 🟡 Medium for component tests (no server) | 🐢 Slow (HTTP round-trip per command adds latency) |
| **Isolation** | Full — all dependencies are mocked | High — network and router are mocked | None — real server, real database, real browser | None for E2E; High for component tests (can stub with `cy.intercept`) | None — real server, real database, real browser |
| **Setup complexity** | Low | Low–Medium (requires jest-environment-jsdom) | High (browser binaries ~400 MB, running server required) | Medium (browser included; running server required for E2E only) | Very High (Selenium bindings + browser drivers + test runner + reporting library all configured separately) |
| **Catches CSS / layout bugs** | ✗ No | ✗ No (jsdom ignores CSS) | ✓ Yes (real browser applies styles) | ✓ Yes (real browser applies styles) | ✓ Yes (real browser applies styles) |
| **Catches browser-specific bugs** | ✗ No | ✗ No | ✓ Yes (runs Chromium, Firefox, WebKit) | ✓ Yes (runs Chromium, Firefox; WebKit experimental) | ✓ Yes (broadest browser coverage including IE and legacy browsers) |
| **Network control** | Manual mocks (`jest.fn`, `msw`) | Manual mocks (`msw`, `jest.fn`) | Built-in intercept / mock / block via `page.route` | Built-in intercept / stub via `cy.intercept` | No built-in interception; requires third-party proxy tools |
| **Auto-waiting** | ✗ No — manual `waitFor` needed | Partial — `waitFor` / `findBy*` helpers | ✓ Yes — waits for visibility, stability, and enabled state automatically | ✓ Yes — retries commands and assertions automatically | ✗ No — manual implicit/explicit/fluent waits required; primary source of flaky tests |
| **Debugging tools** | Console output, `--verbose` flag | `screen.debug()`, Testing Playground | UI mode, Trace Viewer, Codegen, Inspector | Interactive GUI, time-travel debugger, screenshots, video | Dependent on external test runner; no built-in trace or replay |
| **Flakiness risk** | Very low | Low | Medium (timing/animation-dependent tests can be flaky) | Low–Medium | High (manual wait management is error-prone; driver version mismatches) |
| **CI cost** | Minimal | Minimal | Higher (browser binaries, longer run time) | Higher for E2E; Medium for component tests | Higher (Selenium Grid required for parallelism; driver management overhead) |
| **Primary use cases** | Utility functions, data transformations, API handlers, business logic | Component rendering, user events, accessibility, conditional UI | Login flows, multi-page navigation, form submission, checkout, protected routes | E2E: login flows, multi-page navigation, checkout; Component: rendering, user events, CSS/layout | Legacy enterprise E2E suites; cross-browser testing including IE; teams using Java/Ruby/PHP |
| **When to prefer** | You want fast, isolated feedback on a single function or module | You want to verify a component renders and responds to user interaction correctly | You want to verify a complete user journey works end-to-end in a real browser | You prefer Cypress's interactive GUI; or you want component tests in a real browser with real CSS | You must support IE or legacy browsers; you have an existing Selenium suite; your team uses Ruby, PHP, or Perl |
| **When NOT to use** | Testing UI layout, browser APIs, or multi-page flows | Testing server-side logic, CSS, or cross-browser behaviour | Testing a single function or component in isolation (overkill and slow) | Testing async Server Components; or when you need WebKit/Safari coverage (use Playwright instead) | Starting a new project (use Playwright instead); when flakiness from manual waits is unacceptable; when you need built-in parallelism without Grid infrastructure |

---

## Running the Tests

### Unit & Component Tests (Jest + RTL)

```bash
npm run test:jest
```

Run in watch mode during development:

```bash
npm run test:jest -- --watch
```

### End-to-End Tests (Playwright)

Playwright requires the app to be built first:

```bash
# Build the app
npm run build

# Run all Playwright tests
npm run test:playwright
```

Open the interactive Playwright UI:

```bash
npm run test:playwright -- --ui
```

### Cypress Tests

Cypress E2E tests require the app to be running first:

```bash
# Terminal 1 — build and start the server
npm run build && npm run start

# Terminal 2 — open the interactive Cypress GUI
npm run cypress:open

# Or run E2E tests headlessly
npm run test:cypress:e2e
```

Cypress component tests do not need a running server:

```bash
# Interactive GUI (select "Component Testing")
npm run cypress:open

# Headless
npm run test:cypress:component
```

---

## Running the App

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The database runs **in-memory** (SQLite `:memory:`). All data resets on every server restart. The product catalog is automatically seeded with 8 sample products on startup.

### App Overview

The sample app is a simple online store with the following features:

- **Product Catalog** — publicly viewable product listing
- **Authentication** — register and sign in with username/password
- **Shopping Cart** — add, update, and remove items (requires login)
- **Checkout** — enter a shipping address and place an order
- **My Orders** — view past orders, edit shipping address, or cancel
