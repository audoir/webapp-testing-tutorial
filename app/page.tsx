"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cartApi";
import type { Product } from "@/lib/products";
import { useCart } from "@/context/CartContext";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const router = useRouter();
  const { setCartCount } = useCart();

  useEffect(() => {
    const loadData = async () => {
      const [productsRes, authRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/auth/me"),
      ]);
      const [productsData, authData] = await Promise.all([
        productsRes.json(),
        authRes.json(),
      ]);
      setProducts(productsData);
      setIsLoggedIn(authData.isLoggedIn);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleAddToCart = async (productId: number) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setAddingId(productId);
    try {
      const result = await addToCart(productId);
      setCartCount(result.cartCount);
      setMessage({ text: "Added to cart!", type: "success" });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to add to cart", type: "error" });
    }
    setAddingId(null);
    setTimeout(() => setMessage(null), 2500);
  };

  // Group products by category
  const categories = [...new Set(products.map((p) => p.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 text-lg">Loading products...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Product Catalog</h1>
        <p className="text-slate-400">
          {isLoggedIn
            ? "Browse and add items to your cart."
            : "Browse our products. Sign in to add items to your cart."}
        </p>
      </div>

      {message && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${
            message.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="mb-10">
          <h2 className="text-lg font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products
              .filter((p) => p.category === category)
              .map((product) => (
                <div
                  key={product.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-indigo-500 transition-colors flex flex-col"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-44 object-cover bg-slate-700"
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-white mb-1">{product.name}</h3>
                    <p className="text-sm text-slate-400 mb-3 flex-1">{product.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold text-indigo-400">
                        ${product.price.toFixed(2)}
                      </span>
                      <button
                        data-testid={`add-to-cart-${product.id}`}
                        onClick={() => handleAddToCart(product.id)}
                        disabled={addingId === product.id}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {addingId === product.id
                          ? "Adding..."
                          : isLoggedIn
                          ? "Add to Cart"
                          : "Sign in to Buy"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
