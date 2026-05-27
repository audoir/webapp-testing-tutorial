"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface CartContextValue {
  cartCount: number;
  setCartCount: (count: number) => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  cartCount: 0,
  setCartCount: () => {},
  refreshCart: async () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) {
        setCartCount(0);
        return;
      }
      const data = await res.json();
      const count = (data.items ?? []).reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      );
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, setCartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
