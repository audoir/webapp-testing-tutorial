interface PriceableItem {
  price: number;
  quantity: number;
}

export function calculateTotalPrice(items: PriceableItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
