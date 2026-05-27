# Chapter 1 — Unit Testing with Jest

## What is Jest?

[Jest](https://jestjs.io/) is a JavaScript testing framework maintained by Meta. It is the most widely used testing tool in the JavaScript/TypeScript ecosystem and works out of the box with Node.js projects, React apps, and Next.js applications.

Jest provides everything you need in a single package:

| Feature | Description |
|---------|-------------|
| **Test runner** | Discovers and executes test files automatically |
| **Assertion library** | Built-in `expect()` with rich matchers (`toBe`, `toEqual`, `toBeCloseTo`, …) |
| **Mocking** | Spy on functions, mock modules, and fake timers |
| **Coverage** | Built-in code-coverage reports (`--coverage` flag) |

### Why start with Jest?

Unit tests are the fastest and most focused kind of test. They verify a single function or module in isolation — no browser, no network, no database. This makes them:

- **Fast** — a full suite typically runs in milliseconds.
- **Reliable** — no flaky external dependencies.
- **Easy to debug** — a failing test points directly at the broken logic.

### Advantages of Jest

- **Easy to get started** — it works out of the box with almost no configuration.
- **Everything in one package** — the test runner, assertions, mocking, and code coverage are all built in. You don't need to install separate tools.
- **Great mocking support** — replacing databases, HTTP calls, or any other dependency is straightforward, as you'll see in the examples below.
- **Fast feedback** — tests run quickly, and `--watch` mode re-runs only the tests affected by your last change.
- **Widely used** — Jest is the default choice in React and Next.js projects, so there is plenty of documentation and community help available.

### Disadvantages of Jest

- **No real browser** — Jest runs in Node.js, not in a browser. It can simulate a browser environment, but that simulation is incomplete. You won't catch visual bugs or issues that only appear in a real browser.
- **Not for end-to-end tests** — Jest can't open a browser, click through pages, or test a full user journey. You need a separate tool (like Playwright) for that.
- **Mocks can give false confidence** — when you replace a real database or API with a fake, your tests only verify that your code works with the fake. Bugs that only appear when the real dependency is involved can slip through.

### When to use Jest

Use Jest for **unit tests** — tests that check a single function or module in isolation:

- Testing a function that calculates a price, formats a date, or validates input.
- Testing code that talks to a database or an API, by replacing those dependencies with mocks.
- Testing the logic inside a React component (what it renders, how it responds to clicks).

**Use a different tool when** you need to test what a real user sees in a real browser — for example, clicking through a checkout flow or verifying that a page looks correct. Those scenarios are covered in later chapters using Playwright.

---

## Project Setup

The project already has Jest installed and configured. Here is a quick overview of the relevant files.

### Installed packages

```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react \
  @testing-library/dom @testing-library/jest-dom @testing-library/user-event \
  ts-node @types/jest
```

| Package | Purpose |
|---------|---------|
| `jest` | The test runner |
| `@types/jest` | TypeScript type definitions for Jest globals (`describe`, `it`, `expect`, …) |
| `jest-environment-jsdom` | Browser-like DOM environment for component tests |
| `@testing-library/react` | React component rendering and querying helpers |
| `@testing-library/dom` | Core DOM query utilities (peer dependency) |
| `@testing-library/jest-dom` | Custom matchers: `.toBeInTheDocument()`, `.toHaveValue()`, … |
| `@testing-library/user-event` | Realistic user-interaction simulation |
| `ts-node` | Required by `next/jest` to load the Next.js configuration |

### `jest.config.js`

```js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to your Next.js app — loads next.config.js and .env files
  dir: './',
});
```

`next/jest` is the recommended way to configure Jest in a Next.js project. It automatically handles TypeScript, JSX, path aliases, CSS/image imports, and `.env` files — no manual transformer setup required.

```js
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
};

module.exports = createJestConfig(config);
```

- `testEnvironment: 'jsdom'` — runs tests in a simulated browser DOM (required for React component tests).
- `setupFilesAfterEnv` — points to `jest.setup.ts`, which runs once after the framework is installed.
- `moduleNameMapper` — resolves the `@/` path alias used throughout the Next.js app.
- `testPathIgnorePatterns` — prevents Jest from scanning `node_modules` or the `.next` build output.

### `jest.setup.ts`

```ts
import '@testing-library/jest-dom';
```

This file runs after the test framework is installed. The `@testing-library/jest-dom` import extends Jest's `expect` with custom DOM matchers (`.toBeInTheDocument()`, `.toHaveTextContent()`, `.toBeDisabled()`, …) that are used in component tests.

### `package.json` — test script

```json
"scripts": {
  "test:jest": "jest"
}
```

Running `npm run test:jest` will discover every file that matches `**/*.test.ts` (or `**/*.spec.ts`) and execute it. The `test:jest` name is intentional — this project will add other testing frameworks (e.g. Playwright) under their own `test:*` scripts, keeping each tool independently runnable.

---

## Example 1 — Pure Function: `lib/price.ts`

### The Function Under Test

```ts
interface PriceableItem {
  price: number;
  quantity: number;
}

export function calculateTotalPrice(items: PriceableItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

`calculateTotalPrice` takes an array of items (each with a `price` and a `quantity`) and returns the grand total. It is a **pure function** — given the same input it always returns the same output and has no side effects — which makes it a perfect candidate for unit testing.

### Where to Put Test Files — Co-location vs. a Separate Folder

There are two common approaches to organising test files:

**Option A — Co-located (used in this project)**

```
lib/
├── price.ts
├── price.test.ts
├── products.ts
├── products.test.ts
├── cartApi.ts
└── cartApi.test.ts
```

**Option B — Separate `__tests__` folder**

```
lib/
├── price.ts
├── products.ts
└── cartApi.ts
__tests__/
├── price.test.ts
├── products.test.ts
└── cartApi.test.ts
```

This project uses **co-location** (Option A). Here is why:

| Reason | Detail |
|--------|--------|
| **Proximity** | The test file sits right next to the source file — no hunting through a parallel folder tree |
| **Simple relative imports** | `import { calculateTotalPrice } from './price'` instead of `../../lib/price` |
| **Easier mocking** | `jest.mock('./db')` resolves relative to the test file; short paths are less error-prone |
| **Safer refactoring** | Moving or renaming a module and its test is one operation, not two |
| **Industry standard** | This is the dominant convention in Next.js, React, and Node.js projects |

A separate `__tests__` folder makes more sense when tests are **integration or end-to-end** tests that don't map 1-to-1 to a source file (e.g. Playwright tests, which this project adds under a separate `test:*` script), or when a library package needs to keep its `lib/` directory free of non-production files. Neither applies here, so tests live alongside their source.

### Writing the Test — `lib/price.test.ts`

By convention, test files live next to the source file they test and use the `.test.ts` suffix. Start with the import:

```ts
import { calculateTotalPrice } from './price';
```

Then open a `describe` block to group all tests for this function:

```ts
describe('calculateTotalPrice', () => {
```

The first case verifies that multiple items are summed correctly. Inline comments show the expected contribution of each item:

```ts
  it('calculates the total for multiple items', () => {
    const items = [
      { price: 5, quantity: 2 },   // 10
      { price: 20, quantity: 1 },  // 20
      { price: 3, quantity: 4 },   // 12
    ];
    expect(calculateTotalPrice(items)).toBe(42);
  });
```

The second case demonstrates floating-point arithmetic testing. Note the use of `toBeCloseTo` instead of `toBe` for floating-point arithmetic:

```ts
  it('handles decimal prices correctly', () => {
    const items = [
      { price: 1.5, quantity: 2 },  // 3.0
      { price: 0.99, quantity: 3 }, // 2.97
    ];
    expect(calculateTotalPrice(items)).toBeCloseTo(5.97);
  });
});
```

### Key Jest concepts used here

| Concept | Code | Meaning |
|---------|------|---------|
| **`describe`** | `describe('calculateTotalPrice', () => { … })` | Groups related tests under a named suite |
| **`it`** | `it('returns 0 …', () => { … })` | Defines a single test case (alias: `test`) |
| **`expect`** | `expect(result)` | Wraps the value you want to assert on |
| **`.toBe`** | `.toBe(0)` | Strict equality check (`===`) |
| **`.toBeCloseTo`** | `.toBeCloseTo(5.97)` | Floating-point comparison with a small tolerance |

---

## Example 2 — Database Access with Mocking: `lib/products.ts`

### The Problem with Real Databases in Unit Tests

Functions that query a database are extremely common in web applications, but they present a challenge for unit testing:

- A real database must be running and seeded with known data.
- Tests become slow, order-dependent, and fragile.
- The test is no longer isolated — a bug in the database layer can mask a bug in the function.

The solution is **mocking**: replace the real database with a lightweight fake that returns controlled data. Jest makes this straightforward with `jest.mock()`.

### The Function Under Test — `lib/products.ts`

The module imports `getDb` from `lib/db.ts` to obtain the SQLite database handle, then runs prepared statements. In production this hits a real SQLite file; in tests we will replace `getDb` with a mock.

First, the `Product` interface and the import:

```ts
import { getDb } from './db';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}
```

Then the three query functions — each calls `getDb()` and runs a prepared statement:

```ts
export function getProductById(id: number): Product | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}
```

```ts
export function getAllProducts(): Product[] {
  const db = getDb();
  return db.prepare('SELECT * FROM products ORDER BY category, name').all() as Product[];
}
```

```ts
export function getProductsByCategory(category: string): Product[] {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE category = ? ORDER BY name').all(category) as Product[];
}
```

### Writing the Test — `lib/products.test.ts`

#### Test file setup

Import the functions under test and the `db` module, then mock the entire `db` module so no real SQLite database is created:

```ts
import { getProductById, getAllProducts, getProductsByCategory, Product } from './products';
import * as db from './db';

jest.mock('./db');

const mockDb = db.getDb as jest.MockedFunction<typeof db.getDb>;
```

`jest.MockedFunction<T>` is a TypeScript utility type that adds Jest mock methods (`.mockReturnValue`, `.mockResolvedValue`, `.mockImplementation`, …) to the function's type, giving us full type safety when configuring the mock.

#### The `makeFakeDb` helper

The real `better-sqlite3` API is chainable: `db.prepare(sql).get(params)`. This helper mirrors that shape using nested `jest.fn()` stubs. Passing `result` lets each test control exactly what the "database" returns:

```ts
function makeFakeDb(result: unknown) {
  return {
    prepare: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(result),
      all: jest.fn().mockReturnValue(result),
    }),
  };
}
```

#### Sample data

A small array of `Product` objects is defined once at the top of the file and reused across all tests:

```ts
const sampleProducts: Product[] = [
  {
    id: 1,
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling wireless headphones.',
    price: 79.99,
    image_url: 'https://example.com/headphones.jpg',
    category: 'Electronics',
    stock: 50,
  },
  {
    id: 2,
    name: 'Mechanical Keyboard',
    description: 'Compact TKL mechanical keyboard with RGB backlighting.',
    price: 129.99,
    image_url: 'https://example.com/keyboard.jpg',
    category: 'Electronics',
    stock: 30,
  },
  {
    id: 3,
    name: 'Yoga Mat',
    description: 'Non-slip eco-friendly yoga mat.',
    price: 34.99,
    image_url: 'https://example.com/yoga-mat.jpg',
    category: 'Sports',
    stock: 100,
  },
];
```

#### `getProductById` tests

The test creates its own `fakeDb` and tells `mockDb` to return it. Because `prepare` is a `jest.fn()`, Jest records every call made to it. `.toHaveBeenCalledWith(…)` verifies that the function was called with the exact SQL string and parameters we expect:

```ts
describe('getProductById', () => {
  it('returns the matching product when found', () => {
    const fakeDb = makeFakeDb(sampleProducts[0]);
    mockDb.mockReturnValue(fakeDb as unknown as ReturnType<typeof db.getDb>);

    const result = getProductById(1);

    expect(fakeDb.prepare).toHaveBeenCalledWith('SELECT * FROM products WHERE id = ?');
    expect(fakeDb.prepare().get).toHaveBeenCalledWith(1);
    expect(result).toEqual(sampleProducts[0]);
  });
});
```

#### `getAllProducts` tests

```ts
describe('getAllProducts', () => {
  it('returns all products ordered by category and name', () => {
    const fakeDb = makeFakeDb(sampleProducts);
    mockDb.mockReturnValue(fakeDb as unknown as ReturnType<typeof db.getDb>);

    const result = getAllProducts();

    expect(fakeDb.prepare).toHaveBeenCalledWith(
      'SELECT * FROM products ORDER BY category, name'
    );
    expect(result).toHaveLength(3);
    expect(result).toEqual(sampleProducts);
  });
});
```

#### `getProductsByCategory` tests

```ts
describe('getProductsByCategory', () => {
  it('returns only products in the requested category', () => {
    const electronics = sampleProducts.filter((p) => p.category === 'Electronics');
    const fakeDb = makeFakeDb(electronics);
    mockDb.mockReturnValue(fakeDb as unknown as ReturnType<typeof db.getDb>);

    const result = getProductsByCategory('Electronics');

    expect(fakeDb.prepare).toHaveBeenCalledWith(
      'SELECT * FROM products WHERE category = ? ORDER BY name'
    );
    expect(fakeDb.prepare().all).toHaveBeenCalledWith('Electronics');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.category === 'Electronics')).toBe(true);
  });
});
```

### Key Jest concepts introduced in this example

| Concept | Code | Meaning |
|---------|------|---------|
| **`jest.mock`** | `jest.mock('./db')` | Replaces a module with auto-mocked stubs for the entire test file |
| **`jest.MockedFunction`** | `db.getDb as jest.MockedFunction<…>` | TypeScript type that adds mock helpers to a function |
| **`jest.fn()`** | `jest.fn().mockReturnValue(…)` | Creates a standalone mock function with a controlled return value |
| **`.mockReturnValue`** | `mockDb.mockReturnValue(fakeDb)` | Configures what the mock returns when called |
| **`.toHaveBeenCalledWith`** | `expect(fn).toHaveBeenCalledWith(…)` | Asserts the mock was called with specific arguments |
| **`.toEqual`** | `expect(result).toEqual(sampleProducts[0])` | Deep equality check (compares object contents, not references) |
| **`.toBeUndefined`** | `expect(result).toBeUndefined()` | Asserts the value is `undefined` |
| **`.toHaveLength`** | `expect(result).toHaveLength(2)` | Asserts an array has a specific number of elements |

---

## Example 3 — API Access with Mocking: `lib/cartApi.ts`

### The Problem with Real HTTP Calls in Unit Tests

Frontend code that calls `fetch()` is just as common as database access, and it poses the same unit-testing challenge:

- A real server must be running and authenticated.
- Network latency makes tests slow and non-deterministic.
- The test is no longer isolated — a server bug can hide a client bug.

The solution is the same: **mock the dependency**. This time the dependency is the global `fetch` function, and we replace it with a `jest.fn()` that returns whatever response we need.

### The Function Under Test — `lib/cartApi.ts`

The module exports four async functions that wrap `fetch` calls to `/api/cart`. First, the shared interfaces:

```ts
export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
}

export interface CartResponse {
  items: CartItem[];
  total: number;
}

export interface MutationCartResponse extends CartResponse {
  cartCount: number;
}
```

`fetchCart` performs a `GET` and normalises the response, defaulting missing fields to safe values:

```ts
export async function fetchCart(): Promise<CartResponse> {
  const res = await fetch('/api/cart');
  if (!res.ok) {
    throw new Error(`Failed to fetch cart: ${res.status}`);
  }
  const data = await res.json();
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
  };
}
```

`addToCart` sends a `POST` with the product ID and quantity, then returns the full updated cart data:

```ts
export async function addToCart(productId: number, quantity = 1): Promise<MutationCartResponse> {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Failed to add item to cart');
  }
  const data = await res.json();
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    cartCount: data.cartCount as number,
  };
}
```

`updateCartItemQuantity` and `removeFromCart` follow the same pattern — send a `PATCH` or `DELETE`, throw on error, return the full updated cart data:

```ts
export async function updateCartItemQuantity(
  cartItemId: number,
  quantity: number
): Promise<MutationCartResponse> {
  const res = await fetch('/api/cart', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItemId, quantity }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Failed to update cart item');
  }
  const data = await res.json();
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    cartCount: data.cartCount as number,
  };
}

export async function removeFromCart(cartItemId: number): Promise<MutationCartResponse> {
  const res = await fetch('/api/cart', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItemId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Failed to remove cart item');
  }
  const data = await res.json();
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    cartCount: data.cartCount as number,
  };
}
```

These functions are extracted from the inline `fetch` calls scattered across the cart and checkout pages. Centralising them in `lib/cartApi.ts` makes the pages easier to read and — crucially — makes the network logic independently testable.

Note that all three mutation functions (`addToCart`, `updateCartItemQuantity`, and `removeFromCart`) return the full updated cart data (`MutationCartResponse`) rather than just the cart count. This eliminates the need for a separate `GET` request to reload the cart after mutations.

### Writing the Test — `lib/cartApi.test.ts`

#### Test file setup

Unlike the database example where we mocked a module, `fetch` is a **global** — it lives on the `globalThis` object. We create a `jest.fn()` and assign it directly to `global.fetch`. Every call to `fetch(…)` inside the module under test now goes through our mock:

```ts
import { fetchCart, addToCart, updateCartItemQuantity, removeFromCart } from './cartApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;
```

#### The `makeResponse` helper

The real `fetch` returns a `Response` object. Our helper creates a plain object that mimics the two properties our code actually uses: `ok` (a boolean) and `json()` (an async method). `mockResolvedValue` makes `json()` return a resolved Promise, matching the real async behaviour:

```ts
function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}
```

#### `beforeEach` reset

`mockReset()` clears the recorded calls **and** removes any return values configured in a previous test. Without this, a `mockResolvedValue` set in one test could leak into the next, causing false positives or confusing failures:

```ts
beforeEach(() => {
  mockFetch.mockReset();
});
```

#### `fetchCart` tests

`mockResolvedValue(x)` is shorthand for `mockImplementation(() => Promise.resolve(x))`. Because `fetch` is async, we need the mock to return a Promise — this method handles that automatically:

```ts
describe('fetchCart', () => {
  it('returns items and total from the API', async () => {
    const payload = {
      items: [
        { id: 1, product_id: 10, quantity: 2, name: 'Headphones', price: 79.99, image_url: '' },
      ],
      total: 159.98,
    };
    mockFetch.mockResolvedValue(makeResponse(payload));

    const result = await fetchCart();

    expect(mockFetch).toHaveBeenCalledWith('/api/cart');
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(159.98);
  });

  it('throws when the response is not ok', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'Unauthorized' }, 401));

    await expect(fetchCart()).rejects.toThrow('Failed to fetch cart: 401');
  });
});
```

#### `addToCart` tests

We verify not just that `fetch` was called, but that it was called with the **exact URL and options** the server expects. This catches bugs like a missing header or a misspelled field name:

```ts
describe('addToCart', () => {
  it('sends a POST request with the correct body', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true }));

    await addToCart(42, 3);

    expect(mockFetch).toHaveBeenCalledWith('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 42, quantity: 3 }),
    });
  });

  it('defaults quantity to 1 when not provided', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true }));

    await addToCart(7);

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ productId: 7, quantity: 1 });
  });
});
```

Every `jest.fn()` records its invocations in `.mock.calls` — an array of argument arrays. Here we grab the second argument (the options object) from the first call and parse the JSON body to assert on its contents as a plain object.

#### `updateCartItemQuantity` and `removeFromCart` tests

These follow the same pattern — assert on the HTTP method and body:

```ts
describe('updateCartItemQuantity', () => {
  it('sends a PATCH request with cartItemId and quantity', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true }));

    await updateCartItemQuantity(5, 4);

    expect(mockFetch).toHaveBeenCalledWith('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItemId: 5, quantity: 4 }),
    });
  });
});

describe('removeFromCart', () => {
  it('sends a DELETE request with the cartItemId', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true }));

    await removeFromCart(3);

    expect(mockFetch).toHaveBeenCalledWith('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItemId: 3 }),
    });
  });
});
```

### Key Jest concepts introduced in this example

| Concept | Code | Meaning |
|---------|------|---------|
| **Global mock** | `global.fetch = jest.fn()` | Replaces a global (non-module) dependency with a mock |
| **`mockResolvedValue`** | `mockFetch.mockResolvedValue(…)` | Makes an async mock return a resolved Promise |
| **`mockReset`** | `mockFetch.mockReset()` | Clears recorded calls and configured return values between tests |
| **`rejects.toThrow`** | `await expect(fn()).rejects.toThrow(…)` | Asserts that an async function rejects with a specific error |
| **`.mock.calls`** | `mockFetch.mock.calls[0]` | Array of argument lists for every call made to the mock |

---

## Running the Tests

```bash
npm run test:jest
```

Expected output:

```
 PASS  lib/price.test.ts
  calculateTotalPrice
    ✓ calculates the total for multiple items (1 ms)
    ✓ handles decimal prices correctly (1 ms)

 PASS  lib/products.test.ts
  getProductById
    ✓ returns the matching product when found (1 ms)
  getAllProducts
    ✓ returns all products ordered by category and name
  getProductsByCategory
    ✓ returns only products in the requested category (1 ms)

 PASS  lib/cartApi.test.ts
  fetchCart
    ✓ returns items and total from the API (1 ms)
    ✓ throws when the response is not ok
  addToCart
    ✓ sends a POST request with the correct body
    ✓ defaults quantity to 1 when not provided
  updateCartItemQuantity
    ✓ sends a PATCH request with cartItemId and quantity
  removeFromCart
    ✓ sends a DELETE request with the cartItemId

Test Suites: 3 passed, 3 total
Tests:       11 passed, 11 total
```

### Useful flags

| Command | What it does |
|---------|-------------|
| `npm run test:jest -- --watch` | Re-runs tests automatically when files change |
| `npm run test:jest -- --coverage` | Generates a code-coverage report |
| `npm run test:jest -- lib/price.test.ts` | Runs only the specified test file |
| `npm run test:jest -- lib/products.test.ts` | Runs only the products test file |
| `npm run test:jest -- lib/cartApi.test.ts` | Runs only the cart API test file |

---

## Summary

In this chapter you learned:

1. **What Jest is** — a batteries-included JavaScript/TypeScript test framework.
2. **How to configure it** — `jest.config.js` with the `next/jest` preset.
3. **How to test a pure function** — `describe` / `it` / `expect` with matchers like `toBe` and `toBeCloseTo`.
4. **How to mock a module** — `jest.mock()` replaces real dependencies (like a database) with controllable fakes.
5. **How to mock a global** — assign a `jest.fn()` to `global.fetch` to intercept HTTP calls without a real server.
6. **How to assert on mocks** — `toHaveBeenCalledWith`, `rejects.toThrow`, and `.mock.calls` verify both the happy path and error handling.
7. **How to run tests** — `npm run test:jest`.

**Next steps:** Chapter 2 [Component Testing with React Testing Library](../docs/chapter-02-rtl.md)

**Back to:** [Table of Contents](../README.md)
