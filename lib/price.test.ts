import { calculateTotalPrice } from './price';

describe('calculateTotalPrice', () => {
  it('calculates the total for multiple items', () => {
    const items = [
      { price: 5, quantity: 2 },   // 10
      { price: 20, quantity: 1 },  // 20
      { price: 3, quantity: 4 },   // 12
    ];
    expect(calculateTotalPrice(items)).toBe(42);
  });

  it('handles decimal prices correctly', () => {
    const items = [
      { price: 1.5, quantity: 2 },  // 3.0
      { price: 0.99, quantity: 3 }, // 2.97
    ];
    expect(calculateTotalPrice(items)).toBeCloseTo(5.97);
  });
});
