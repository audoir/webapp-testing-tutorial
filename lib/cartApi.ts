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
