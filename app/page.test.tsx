import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './page';
import Navbar from '../components/Navbar';
import { CartProvider } from '../context/CartContext';

// Mock next/navigation (used by useRouter inside the component)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
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

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch
    .mockResolvedValueOnce(makeResponse([]))                     // /api/products
    .mockResolvedValueOnce(makeResponse({ isLoggedIn: false })); // /api/auth/me
});

describe('HomePage', () => {
  it('renders the product catalogue heading after data loads', async () => {
    render(<HomePage />);

    // Wait for the async useEffect to finish and the loading state to clear
    await waitFor(() =>
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument()
    );

    expect(screen.getByRole('heading', { name: 'Product Catalog' })).toBeInTheDocument();
  });

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

describe('Navbar', () => {
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

  it('shows the cart item count badge when the cart has items', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeResponse({ isLoggedIn: true, username: 'alice' })) // /api/auth/me
      .mockResolvedValueOnce(makeResponse({                                         // /api/cart
        items: [
          { id: 1, product_id: 10, quantity: 2, name: 'Headphones', price: 79.99, image_url: null },
          { id: 2, product_id: 11, quantity: 1, name: 'Keyboard',   price: 49.99, image_url: null },
        ],
      }));

    // Navbar uses useCart() which reads from CartContext. Wrap it in CartProvider so
    // refreshCart can update cartCount and the badge re-renders.
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    );

    // Wait for auth + cart data to load
    await waitFor(() =>
      expect(screen.getByText('alice')).toBeInTheDocument()
    );

    // Total quantity is 2 + 1 = 3, so the badge should show "3"
    // CartContext.refreshCart sums item quantities from /api/cart
    await waitFor(() =>
      expect(screen.getByText('3')).toBeInTheDocument()
    );
  });
});

describe('Add to Cart — HomePage', () => {
  const product = {
    id: 42,
    name: 'Wireless Mouse',
    description: 'A smooth wireless mouse.',
    price: 29.99,
    image_url: null,
    category: 'Accessories',
    stock: 10,
  };

  it('clicking "Add to Cart" calls the cart API and shows a success message', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeResponse([product]))                                // /api/products
      .mockResolvedValueOnce(makeResponse({ isLoggedIn: true, username: 'alice' })) // /api/auth/me
      .mockResolvedValueOnce(makeResponse({                                         // POST /api/cart
        items: [{ id: 1, product_id: 42, quantity: 1, name: 'Wireless Mouse', price: 29.99, image_url: '' }],
        total: 29.99,
        cartCount: 1
      }));

    render(<HomePage />);

    // Wait for products to load
    await waitFor(() =>
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument()
    );

    // The product card should be visible
    expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();

    // Click the "Add to Cart" button
    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    // The POST to /api/cart should have been made
    expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ productId: 42, quantity: 1 }),
    }));

    // A success toast should appear
    await waitFor(() =>
      expect(screen.getByText('Added to cart!')).toBeInTheDocument()
    );
  });
});

