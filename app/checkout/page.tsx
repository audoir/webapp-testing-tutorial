"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCart } from "@/lib/cartApi";
import type { CartItem } from "@/lib/cartApi";

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loadCart = async () => {
      try {
        const data = await fetchCart();
        if (data.items.length === 0) {
          router.push("/cart");
          return;
        }
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error && err.message.includes("401")) {
          router.push("/login");
        }
      }
    };
    loadCart();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shippingAddress }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (data.success) {
      router.push("/orders?success=1");
    } else {
      setError(data.error || "Checkout failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 text-lg">Loading checkout...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <h2 className="text-lg font-semibold text-slate-300 mb-4">Order Summary</h2>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-4 ${
                  idx < items.length - 1 ? "border-b border-slate-700" : ""
                }`}
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded-lg bg-slate-700 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{item.name}</p>
                  <p className="text-slate-400 text-xs">Qty: {item.quantity}</p>
                </div>
                <span className="font-semibold text-white text-sm">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-between items-center">
              <span className="font-semibold text-slate-300">Total</span>
              <span className="text-xl font-bold text-indigo-400">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Form */}
        <div>
          <h2 className="text-lg font-semibold text-slate-300 mb-4">Shipping Details</h2>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Shipping Address
                </label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  required
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>

              <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-3 text-xs text-indigo-300">
                💳 Payment is simulated — no real charges will be made.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {submitting ? "Placing Order..." : `Place Order — $${total.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
