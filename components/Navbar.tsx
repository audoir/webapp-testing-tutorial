"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";

interface AuthState {
  isLoggedIn: boolean;
  username?: string;
}

export default function Navbar() {
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false });
  const [loading, setLoading] = useState(true);
  const { cartCount, refreshCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const refreshAuth = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const data = await authRes.json();
      setAuth(data);
      setLoading(false);

      if (data.isLoggedIn) {
        await refreshCart();
      }
    } catch {
      setLoading(false);
    }
  };

  // Re-check auth and cart count whenever the route changes
  useEffect(() => {
    refreshAuth();
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ isLoggedIn: false });
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 shadow-lg">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
        <Link href="/" className="text-xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
          🛍️ ShopNext
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-slate-300 hover:text-white font-medium transition-colors"
          >
            Products
          </Link>

          {!loading && auth.isLoggedIn && (
            <>
              <Link
                href="/cart"
                className="relative text-slate-300 hover:text-white font-medium transition-colors flex items-center gap-1"
              >
                🛒 Cart
                {cartCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-indigo-500 text-white rounded-full">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/orders"
                className="text-slate-300 hover:text-white font-medium transition-colors"
              >
                My Orders
              </Link>
            </>
          )}

          {!loading && (
            <div className="flex items-center gap-3">
              {auth.isLoggedIn ? (
                <>
                  <span className="text-sm text-slate-400">
                    Hi, <span className="font-semibold text-slate-200">{auth.username}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-slate-300 hover:text-white font-medium text-sm transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
