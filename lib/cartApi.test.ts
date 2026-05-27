import { fetchCart, addToCart, updateCartItemQuantity, removeFromCart } from './cartApi';

// Replace the global fetch with a Jest mock for the entire test file
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper: build a minimal Response-like object that fetch would return
function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// fetchCart
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// addToCart
// ---------------------------------------------------------------------------
describe('addToCart', () => {
  it('sends a POST request with the correct body and returns updated cart', async () => {
    const responsePayload = {
      items: [{ id: 1, product_id: 42, quantity: 3, name: 'Test Product', price: 29.99, image_url: '' }],
      total: 89.97,
      cartCount: 3,
    };
    mockFetch.mockResolvedValue(makeResponse(responsePayload));

    const result = await addToCart(42, 3);

    expect(mockFetch).toHaveBeenCalledWith('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 42, quantity: 3 }),
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(89.97);
    expect(result.cartCount).toBe(3);
  });

  it('defaults quantity to 1 when not provided', async () => {
    const responsePayload = {
      items: [{ id: 1, product_id: 7, quantity: 1, name: 'Test Product', price: 19.99, image_url: '' }],
      total: 19.99,
      cartCount: 1,
    };
    mockFetch.mockResolvedValue(makeResponse(responsePayload));

    const result = await addToCart(7);

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ productId: 7, quantity: 1 });
    expect(result.cartCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// updateCartItemQuantity
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// removeFromCart
// ---------------------------------------------------------------------------
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
