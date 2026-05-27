"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCart as fetchCartApi, updateCartItemQuantity, removeFromCart } from "@/lib/cartApi";
import type { CartItem } from "@/lib/cartApi";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const router = useRouter();
  const { setCartCount } = useCart();

  const loadCart = async () => {
    try {
      const data = await fetchCartApi();
      setItems(data.items);
      setTotal(data.total);
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        router.push("/login");
      }
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleUpdateQuantity = async (cartItemId: number, quantity: number) => {
    setUpdating(cartItemId);
    const result = await updateCartItemQuantity(cartItemId, quantity);
    setItems(result.items);
    setTotal(result.total);
    setCartCount(result.cartCount);
    setUpdating(null);
  };

  const handleRemove = async (cartItemId: number) => {
    setUpdating(cartItemId);
    const result = await removeFromCart(cartItemId);
    setItems(result.items);
    setTotal(result.total);
    setCartCount(result.cartCount);
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 text-lg">Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
          <div className="text-5xl mb-4">🛒</div>
          <p className="text-slate-400 mb-4">Your cart is empty.</p>
          <Link
            href="/"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-block"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-6">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 ${
                  idx < items.length - 1 ? "border-b border-slate-700" : ""
                }`}
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg bg-slate-700 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{item.name}</h3>
                  <p className="text-indigo-400 font-medium">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={updating === item.id}
                    className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center font-bold text-slate-200 disabled:opacity-50 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium text-white">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={updating === item.id}
                    className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center font-bold text-slate-200 disabled:opacity-50 transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="w-20 text-right font-semibold text-white">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={updating === item.id}
                  className="text-slate-500 hover:text-red-400 disabled:opacity-50 ml-2 transition-colors"
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-slate-300">Total</span>
              <span className="text-2xl font-bold text-indigo-400">${total.toFixed(2)}</span>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium text-center transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/"
              className="block w-full mt-3 text-center text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              ← Continue Shopping
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
