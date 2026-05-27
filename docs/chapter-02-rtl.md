# Chapter 2 — Component Testing with React Testing Library

## What is React Testing Library?

[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (RTL) is a lightweight testing utility built on top of the DOM Testing Library. It provides helper functions for rendering React components and querying the resulting DOM — the same way a real user would interact with the page.

Its guiding principle:

> **The more your tests resemble the way your software is used, the more confidence they can give you.**

Rather than inspecting a component's internal state or implementation details, RTL encourages you to query the DOM by visible text, roles, and labels — exactly as a user (or a screen reader) would.

| Feature | Description |
|---------|-------------|
| **`render`** | Mounts a React component into a real (jsdom) DOM |
| **`screen`** | Queries the rendered DOM by text, role, label, etc. |
| **`waitFor`** | Waits for async DOM changes to settle before asserting |
| **`userEvent`** | Simulates realistic user interactions (click, type, …) |
| **Custom matchers** | `@testing-library/jest-dom` adds `.toBeInTheDocument()`, `.toHaveValue()`, and more |

### Why use RTL instead of plain Jest?

Jest alone runs in Node.js and has no DOM. RTL adds a simulated browser environment (jsdom) and a set of DOM-aware query helpers. This lets you test what the user actually sees — rendered HTML — rather than internal React state.

### Advantages of RTL

- **Tests resemble real usage** — queries like `getByRole('button', { name: 'Add to Cart' })` mirror how a user (or assistive technology) finds elements.
- **Discourages implementation-detail testing** — you can't easily inspect component state or call lifecycle methods, which keeps tests resilient to refactors.
- **Works with Jest** — RTL is not a test runner; it plugs into Jest and reuses all the matchers and mocking you already know.
- **Accessible by default** — preferring role-based queries nudges you toward writing more accessible markup.

### Disadvantages of RTL

- **jsdom is not a real browser** — CSS is not applied, layout is not computed, and some browser APIs are missing or incomplete.
- **Async state updates need care** — React state changes triggered by `useEffect` or async calls must be awaited with `waitFor` or `findBy*` queries to avoid spurious `act(...)` warnings.
- **Not for end-to-end tests** — RTL cannot navigate between pages, test real network calls, or verify visual appearance. Use Playwright for those scenarios.

### When to use RTL

Use RTL for **component tests** — tests that verify what a component renders and how it responds to user interaction:

- Checking that a page renders a heading or a list of items.
- Verifying that clicking a button triggers the right behaviour.
- Testing form validation messages.

---

## Example — Render Test: `app/page.tsx`

### The Component Under Test

`app/page.tsx` is the home page of the application. It:

1. Fetches the product list from `/api/products` and the auth status from `/api/auth/me` in a `useEffect`.
2. Shows a **loading spinner** while the data is in flight.
3. Once loaded, renders a **product catalogue** grouped by category.
4. Uses `useRouter` from `next/navigation` to redirect unauthenticated users to `/login` when they try to add an item to the cart.

Because the component makes network calls and uses Next.js routing, both dependencies must be mocked before the component can be rendered in a test.

### Writing the Test — `app/page.test.tsx`

#### Test file setup

The test file imports the components under test and the RTL helpers, then sets up the two mocks that every test in the file needs.

First, mock `next/navigation`. `HomePage` calls `useRouter()` and `Navbar` calls both `useRouter()` and `usePathname()` at the top level. In a test environment there is no Next.js router, so calling the real hooks would throw. `jest.mock` replaces the entire module with a lightweight stub — `useRouter` returns a fake router with a `push` spy, and `usePathname` returns a fixed path string:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './page';
import Navbar from '../components/Navbar';
import { CartProvider } from '../context/CartContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));
```

Next, replace the global `fetch`. The component calls `fetch('/api/products')` and `fetch('/api/auth/me')` inside a `useEffect`. Replacing the global `fetch` with a `jest.fn()` prevents any real HTTP requests and gives us full control over what the component receives:

```tsx
const mockFetch = jest.fn();
global.fetch = mockFetch;
```

#### The `makeResponse` helper

The real `fetch` returns a `Response` object. Our helper creates a plain object that mimics the two properties the component uses: `ok` (boolean) and `json()` (async method):

```tsx
function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}
```

#### `beforeEach` — resetting and re-configuring the mock

`mockReset()` clears any calls and return values from the previous test. `mockResolvedValueOnce` queues responses in order — the first call to `fetch` gets the products response, the second gets the auth response. This matches the order in which `Promise.all` fires them inside the component:

```tsx
beforeEach(() => {
  mockFetch.mockReset();
  mockFetch
    .mockResolvedValueOnce(makeResponse([]))                     // /api/products
    .mockResolvedValueOnce(makeResponse({ isLoggedIn: false })); // /api/auth/me
});
```

#### Test 1 — async loaded state with `waitFor`

After `render`, the component is still loading. `waitFor` repeatedly runs its callback until it stops throwing — in this case, until the loading spinner disappears. Once the spinner is gone, the component has finished its `useEffect` and rendered the catalogue. We then assert that the `<h1>Product Catalog</h1>` heading is present using `getByRole('heading', { name: … })` — a role-based query that mirrors how a screen reader would find the element:

```tsx
  it('renders the product catalogue heading after data loads', async () => {
    render(<HomePage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument()
    );

    expect(screen.getByRole('heading', { name: 'Product Catalog' })).toBeInTheDocument();
  });
```

#### Test 2 — signed-in state for `HomePage`

`beforeEach` sets up the default signed-out scenario, so any test that needs a different auth state must call `mockFetch.mockReset()` first to clear the queued responses, then re-queue its own. Here we return `{ isLoggedIn: true, username: 'alice' }` from `/api/auth/me`. After waiting for the loading state to clear, we assert that the signed-in subtitle is visible:

```tsx
  it('shows "Browse and add items to your cart." when signed in', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeResponse([]))                                    // /api/products
      .mockResolvedValueOnce(makeResponse({ isLoggedIn: true, username: 'alice' })); // /api/auth/me

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument()
    );

    expect(
      screen.getByText('Browse and add items to your cart.')
    ).toBeInTheDocument();
  });
});
```

The signed-out subtitle (`"Browse our products. Sign in to add items to your cart."`) would be present instead if `isLoggedIn` were `false`.

#### Tests 3 & 4 — `Navbar` signed-in states

`Navbar` fetches `/api/auth/me` on mount (triggered by `usePathname` changing). When signed in, `Navbar` makes two calls: first `/api/auth/me`, then `/api/cart` (to populate the cart badge). So we queue two responses. `waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument())` waits until both async calls have resolved and the component has re-rendered with the auth data. The `getByRole('link', { name: /cart/i })` query uses a regex so it matches the link text `"🛒 Cart"` regardless of the emoji:

```tsx
  it('renders username, Sign Out button, Cart and My Orders links when signed in', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeResponse({ isLoggedIn: true, username: 'alice' })) // /api/auth/me
      .mockResolvedValueOnce(makeResponse({ items: [] }));                          // /api/cart

    render(<Navbar />);

    await waitFor(() =>
      expect(screen.getByText('alice')).toBeInTheDocument()
    );

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cart/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Orders' })).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });
```

### Key RTL concepts introduced in this example

| Concept | Code | Meaning |
|---------|------|---------|
| **`render`** | `render(<HomePage />)` | Mounts the component into a jsdom DOM |
| **`screen`** | `screen.getByText(…)` | Global object for querying the rendered DOM |
| **`getByText`** | `screen.getByText('Loading products...')` | Finds an element by its visible text content; throws if not found |
| **`queryByText`** | `screen.queryByText('Loading products...')` | Like `getByText` but returns `null` instead of throwing when not found — useful for asserting absence |
| **`getByRole`** | `screen.getByRole('heading', { name: … })` | Finds an element by its ARIA role and accessible name |
| **`waitFor`** | `await waitFor(() => expect(…))` | Retries the callback until it passes or times out — used to wait for async state updates |
| **`.toBeInTheDocument()`** | `expect(el).toBeInTheDocument()` | Asserts the element exists in the document (from `@testing-library/jest-dom`) |
| **`jest.mock`** | `jest.mock('next/navigation', …)` | Replaces a module with a stub for the entire test file |
| **`global.fetch`** | `global.fetch = mockFetch` | Replaces the global `fetch` with a Jest mock |

---

## Example — Interaction Test: Add to Cart

### The Components Under Test

This example covers three related pieces of functionality:

1. **`Navbar`** — displays a numeric badge on the Cart link showing the total number of items in the cart.
2. **`HomePage`** — renders product cards with an **Add to Cart** button (signed-in users) or a **Sign in to Buy** button (signed-out users). Clicking **Add to Cart** calls `POST /api/cart` and shows a success toast.
3. **`CartPage`** (`app/cart/page.tsx`) — lists cart items with **+** / **−** quantity buttons and a **✕** remove button. Each button calls the cart API and reloads the cart.

### The `CartProvider` Wrapper

`Navbar` and `CartPage` both call `useCart()` to read and update `cartCount`. In the real app, `CartProvider` is mounted in `app/layout.tsx` and wraps the entire page tree. In tests, components that need a live `CartContext` must be wrapped manually:

```tsx
render(
  <CartProvider>
    <Navbar />
  </CartProvider>
);
```

Without the wrapper, `useCart()` returns the default context value (`cartCount: 0`, no-op `refreshCart`), so the badge never appears even when the mock returns items.

### Writing the Tests

#### Cart badge — `Navbar` with `CartProvider`

`Navbar` calls `useCart()` to read `cartCount` and call `refreshCart()`. Wrapping the component in `<CartProvider>` gives it a live context that actually calls `fetch('/api/cart')` and updates `cartCount` — which is why we queue a second mock response for `/api/cart` in this test:

```tsx
describe('Navbar', () => {
  it('shows the cart item count badge when the cart has items', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeResponse({ isLoggedIn: true, username: 'alice' })) // /api/auth/me
      .mockResolvedValueOnce(makeResponse({                                         // /api/cart
        items: [
          { id: 1, product_id: 10, quantity: 2, name: 'Headphones', price: 79.99, image_url: '' },
          { id: 2, product_id: 11, quantity: 1, name: 'Keyboard',   price: 49.99, image_url: '' },
        ],
      }));

    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    );

    await waitFor(() =>
      expect(screen.getByText('alice')).toBeInTheDocument()
    );

    // Total quantity is 2 + 1 = 3, so the badge should show "3"
    await waitFor(() =>
      expect(screen.getByText('3')).toBeInTheDocument()
    );
  });
});
```

#### Simulating a button click with `userEvent`

`userEvent.click` from `@testing-library/user-event` fires the full sequence of pointer and keyboard events that a real browser would produce — `pointerover`, `pointerenter`, `mouseover`, `mouseenter`, `pointermove`, `mousemove`, `pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`. This is more realistic than `fireEvent.click`, which only fires the `click` event. Because `userEvent` is async, it must be `await`ed.

#### Add to Cart — `HomePage`

We queue three responses: the initial product list, the auth check, and the `POST /api/cart` response. After waiting for the products to load, we click the button and assert on both the API call and the success toast:

```tsx
describe('Add to Cart — HomePage', () => {
  const product = {
    id: 42,
    name: 'Wireless Mouse',
    description: 'A smooth wireless mouse.',
    price: 29.99,
    image_url: '',
    category: 'Accessories',
    stock: 10,
  };

  it('clicking "Add to Cart" calls the cart API and shows a success message', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeResponse([product]))                                // /api/products
      .mockResolvedValueOnce(makeResponse({ isLoggedIn: true, username: 'alice' })) // /api/auth/me
      .mockResolvedValueOnce(makeResponse({ cartCount: 1 }));                       // POST /api/cart

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument()
    );

    expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));
```

`expect.objectContaining` matches any object that has at least the listed keys — it ignores extra properties like `headers`. This keeps the assertion focused on what matters (the HTTP method and body) without being brittle about the full options object:

```tsx
    expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ productId: 42, quantity: 1 }),
    }));

    await waitFor(() =>
      expect(screen.getByText('Added to cart!')).toBeInTheDocument()
    );
  });
```
---

## Example — Cart Page Tests: `app/cart/page.test.tsx`

The cart page tests live in their own file — `app/cart/page.test.tsx` — because `CartPage` is a separate route component with its own fetch lifecycle, independent of `HomePage` and `Navbar`. Keeping the tests co-located with the component they cover makes the test suite easier to navigate and avoids polluting `app/page.test.tsx` with unrelated `beforeEach` setup.

### The Component Under Test

`app/cart/page.tsx` fetches the cart from `GET /api/cart` on mount and renders a list of items. Each item has **+** and **−** buttons that call `PATCH /api/cart` to update the quantity, and a **✕** button that calls `DELETE /api/cart` to remove the item. After each mutation the API returns the updated cart directly (`{ items, total, cartCount }`), so the component updates state from the response without making a second `GET` request.

### Test file setup

The file has its own `jest.mock` for `next/navigation` and its own `global.fetch` mock. A `beforeEach` inside the `describe` block calls `mockFetch.mockReset()` before each test so stale queued responses never leak between tests:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartPage from './page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/cart',
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('Cart Page', () => {
  const cartItem = {
    id: 1,
    product_id: 10,
    quantity: 2,
    name: 'Headphones',
    price: 79.99,
    image_url: '',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });
```

### Writing the Tests

#### Cart Page — render and quantity updates

The `CartPage` tests start by rendering the cart with a single item. The `+` button triggers a `PATCH` to update the quantity. The API returns the updated cart directly, so no second `GET` request is needed.

First, the basic render test. Note the use of `getAllByText` — the cart page renders the same dollar amount in two places (per-item subtotal and the order summary panel), so `getByText` would throw because it finds two matches:

```tsx
  it('renders the cart items and total', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(makeResponse({
      items: [cartItem],
      total: 159.98,
    }));

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument()
    );

    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // getAllByText handles the case where the amount appears in both the per-item subtotal and the summary panel
    expect(screen.getAllByText('$159.98').length).toBeGreaterThanOrEqual(1);
  });
```

The `+` button test queues two responses — the initial load and the `PATCH` — then clicks the button and asserts on both the API call and the updated DOM. Because the `PATCH` response includes the full updated cart (`{ items, total, cartCount }`), no reload request is needed:

```tsx
  it('clicking "+" increases the quantity', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [cartItem], total: 159.98 })); // initial GET
    mockFetch.mockResolvedValueOnce(makeResponse({                                      // PATCH — returns updated cart
      items: [{ ...cartItem, quantity: 3 }],
      total: 239.97,
      cartCount: 3,
    }));

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: '+' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ cartItemId: 1, quantity: 3 }),
    }));

    await waitFor(() =>
      expect(screen.getByText('3')).toBeInTheDocument()
    );
    expect(screen.getAllByText('$239.97').length).toBeGreaterThanOrEqual(1);
  });
```

The remove button test queues a `DELETE` response that returns the updated (empty) cart directly:

```tsx
  it('clicking "✕" removes the item from the cart', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [cartItem], total: 159.98 })); // initial GET
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [], total: 0, cartCount: 0 })); // DELETE — returns updated cart

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument()
    );

    expect(screen.getByText('Headphones')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '✕' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ cartItemId: 1 }),
    }));

    await waitFor(() =>
      expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
    );
  });
});
```

### Key RTL concepts introduced in this example

| Concept | Code | Meaning |
|---------|------|---------|
| **`userEvent.click`** | `await userEvent.click(button)` | Simulates a realistic click with the full browser event sequence |
| **`getByRole('button', { name })`** | `screen.getByRole('button', { name: 'Add to Cart' })` | Finds a button by its accessible name (visible text) |
| **`expect.objectContaining`** | `expect.objectContaining({ method: 'POST' })` | Matches objects that include at least the specified keys |
| **`getAllByText`** | `screen.getAllByText('$159.98')` | Returns all elements matching the text — use when duplicates are expected |
| **`CartProvider` wrapper** | `render(<CartProvider><Navbar /></CartProvider>)` | Provides a live `CartContext` so `useCart()` hooks work correctly in isolation |

---

## Running the Tests

```bash
npm run test:jest
```

Expected output:

```
 PASS  app/page.test.tsx
   HomePage
     ✓ renders the product catalogue heading after data loads (107 ms)
     ✓ shows "Browse and add items to your cart." when signed in (9 ms)
   Navbar
     ✓ renders username, Sign Out button, Cart and My Orders links when signed in (29 ms)
     ✓ shows the cart item count badge when the cart has items (13 ms)
   Add to Cart — HomePage
     ✓ clicking "Add to Cart" calls the cart API and shows a success message (89 ms)

 PASS  app/cart/page.test.tsx
   Cart Page
     ✓ renders the cart items and total (17 ms)
     ✓ clicking "+" increases the quantity (64 ms)
     ✓ clicking "✕" removes the item from the cart (50 ms)

 PASS  lib/price.test.ts
 PASS  lib/products.test.ts
 PASS  lib/cartApi.test.ts

Test Suites: 5 passed, 5 total
Tests:       19 passed, 19 total
```

To run only the home page tests:

```bash
npm run test:jest -- app/page.test.tsx
```

To run only the cart page tests:

```bash
npm run test:jest -- app/cart/page.test.tsx
```

---

## Summary

In this chapter you learned:

1. **What React Testing Library is** — a DOM-focused testing utility that encourages testing from the user's perspective.
2. **How to mock Next.js dependencies** — `jest.mock('next/navigation', …)` replaces the router so components that call `useRouter` or `usePathname` can be rendered in isolation.
3. **How to mock `fetch`** — assign a `jest.fn()` to `global.fetch` and use `mockResolvedValueOnce` to queue responses in the order the component requests them.
4. **How to write a synchronous render test** — `render`, `screen.getByText`, and `.toBeInTheDocument()` are the three building blocks of a basic RTL test.
5. **How to handle async state updates** — `waitFor` retries an assertion until it passes, letting you test the DOM after a `useEffect` has resolved.
6. **How to test auth-dependent UI** — override `mockFetch` inside a specific test with `mockReset()` followed by new `mockResolvedValueOnce` calls to simulate a signed-in user, then assert on the elements that only appear when `isLoggedIn` is `true`.
7. **How to test user interactions** — `userEvent.click` simulates a realistic click, and `expect.objectContaining` keeps API-call assertions focused without being brittle.
8. **How to handle duplicate text** — use `getAllByText` when the same value appears in multiple places (e.g. a price shown in both the item row and the order summary).
9. **How to organise test files** — co-locate each component's tests with the component itself (e.g. `app/cart/page.test.tsx` alongside `app/cart/page.tsx`) so the test suite stays easy to navigate as the project grows.

**Next steps:** Chapter 3 [End-to-End Testing with Playwright](../docs/chapter-03-playwright.md)

**Back to:** [Table of Contents](../README.md)