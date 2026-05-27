import { getProductById, getAllProducts, getProductsByCategory, Product } from './products';
import * as db from './db';

// Mock the entire db module so no real SQLite database is created
jest.mock('./db');

const mockDb = db.getDb as jest.MockedFunction<typeof db.getDb>;

// Helper to build a fake db object with a chainable .prepare().get() / .all() interface
function makeFakeDb(result: unknown) {
  return {
    prepare: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(result),
      all: jest.fn().mockReturnValue(result),
    }),
  };
}

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
