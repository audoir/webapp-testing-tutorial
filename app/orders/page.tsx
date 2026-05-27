"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  total: number;
  status: string;
  shipping_address: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50",
  confirmed: "bg-blue-900/50 text-blue-300 border border-blue-700/50",
  shipped: "bg-purple-900/50 text-purple-300 border border-purple-700/50",
  delivered: "bg-green-900/50 text-green-300 border border-green-700/50",
  cancelled: "bg-red-900/50 text-red-300 border border-red-700/50",
};

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchOrders = async () => {
    const res = await fetch("/api/orders");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    if (searchParams.get("success") === "1") {
      setMessage({ text: "🎉 Order placed successfully!", type: "success" });
      setTimeout(() => setMessage(null), 4000);
    }
  }, []);

  const handleStartEdit = (order: Order) => {
    setEditingOrderId(order.id);
    setEditItems(order.items.map((item) => ({ ...item })));
  };

  const handleItemQuantityChange = (itemId: number, quantity: number) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: 0 } : item))
    );
  };

  const handleSaveEdit = async (orderId: number) => {
    setSaving(true);
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: editItems }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setEditingOrderId(null);
      if (data.deleted) {
        setMessage({ text: "Order cancelled (no items remaining).", type: "success" });
      } else {
        setMessage({ text: "Order updated successfully.", type: "success" });
      }
      await fetchOrders();
    } else {
      setMessage({ text: data.error || "Failed to update order.", type: "error" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setDeletingId(orderId);
    const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (data.success) {
      setMessage({ text: "Order cancelled.", type: "success" });
      await fetchOrders();
    } else {
      setMessage({ text: data.error || "Failed to cancel order.", type: "error" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">My Orders</h1>

      {message && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white font-medium ${
            message.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-slate-400 mb-4">You haven&apos;t placed any orders yet.</p>
          <a
            href="/"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-block"
          >
            Start Shopping
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isEditing = editingOrderId === order.id;
            const canEdit = order.status !== "shipped" && order.status !== "delivered";

            return (
              <div
                key={order.id}
                className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900/40">
                  <div>
                    <span className="font-semibold text-white">Order #{order.id}</span>
                    <span className="text-slate-500 text-sm ml-3">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                        STATUS_COLORS[order.status] || "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="font-bold text-indigo-400">${order.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-6 py-4">
                  {isEditing ? (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-300 mb-3">Edit Items:</p>
                      <div className="space-y-3">
                        {editItems.map((item) => {
                          const isRemoved = item.quantity <= 0;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                isRemoved
                                  ? "border-red-800/50 bg-red-900/20 opacity-60"
                                  : "border-slate-600 bg-slate-900/40"
                              }`}
                            >
                              <span className={`flex-1 text-sm ${isRemoved ? "line-through text-slate-500" : "text-slate-200"}`}>
                                {item.product_name}
                                <span className="text-slate-400 ml-1">(${item.price.toFixed(2)} each)</span>
                              </span>
                              {!isRemoved ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleItemQuantityChange(item.id, item.quantity - 1)}
                                    className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center font-bold text-slate-200 transition-colors"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center text-white font-medium">{item.quantity}</span>
                                  <button
                                    onClick={() => handleItemQuantityChange(item.id, item.quantity + 1)}
                                    className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center font-bold text-slate-200 transition-colors"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="ml-1 text-red-400 hover:text-red-300 text-sm transition-colors"
                                    title="Remove item"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleItemQuantityChange(item.id, 1)}
                                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleSaveEdit(order.id)}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={() => setEditingOrderId(null)}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-slate-300">
                            {item.product_name}{" "}
                            <span className="text-slate-500">× {item.quantity}</span>
                          </span>
                          <span className="text-white font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shipping Address */}
                  {!isEditing && (
                    <div className="text-sm text-slate-400 mb-4">
                      <span className="font-medium text-slate-300">Ship to: </span>
                      <span>{order.shipping_address}</span>
                    </div>
                  )}

                  {/* Actions */}
                  {canEdit && !isEditing && (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleStartEdit(order)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        ✏️ Edit Items
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={deletingId === order.id}
                        className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50"
                      >
                        {deletingId === order.id ? "Cancelling..." : "🗑️ Cancel Order"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-64"><div className="text-slate-400 text-lg">Loading...</div></div>}>
      <OrdersContent />
    </Suspense>
  );
}
