import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartPage from './page';

// Mock next/navigation (used by useRouter inside the component)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/cart',
}));

// Mock fetch so the component doesn't make real network calls
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
    image_url: null,
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders the cart items and total', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(makeResponse({
      items: [cartItem],
      total: 159.98,
    })); // GET /api/cart

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument()
    );

    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // The total appears in the summary panel — use getAllByText since the per-item subtotal also shows $159.98
    expect(screen.getAllByText('$159.98').length).toBeGreaterThanOrEqual(1);
  });

  it('clicking "+" increases the quantity', async () => {
    mockFetch.mockReset();
    // Initial load
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [cartItem], total: 159.98 }));
    // PATCH response — returns updated cart directly
    mockFetch.mockResolvedValueOnce(makeResponse({
      items: [{ ...cartItem, quantity: 3 }],
      total: 239.97,
      cartCount: 3,
    }));

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument()
    );

    // Click the "+" button
    await userEvent.click(screen.getByRole('button', { name: '+' }));

    // The PATCH request should have been sent with quantity 3
    expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ cartItemId: 1, quantity: 3 }),
    }));

    // After the mutation the quantity and total should update
    await waitFor(() =>
      expect(screen.getByText('3')).toBeInTheDocument()
    );
    // The total appears in both the per-item subtotal and the summary panel
    expect(screen.getAllByText('$239.97').length).toBeGreaterThanOrEqual(1);
  });


  it('clicking "✕" removes the item from the cart', async () => {
    mockFetch.mockReset();
    // Initial load
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [cartItem], total: 159.98 }));
    // DELETE response — returns updated (empty) cart directly
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [], total: 0, cartCount: 0 }));

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument()
    );

    expect(screen.getByText('Headphones')).toBeInTheDocument();

    // Click the remove button — the button's accessible name comes from its text content "✕"
    await userEvent.click(screen.getByRole('button', { name: '✕' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ cartItemId: 1 }),
    }));

    // After removal the empty-cart message should appear
    await waitFor(() =>
      expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
    );
  });
});
