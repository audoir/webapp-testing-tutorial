import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateTotalPrice } from "@/lib/price";

interface Order {
  id: number;
  user_id: number;
  status: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  price: number;
  quantity: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);
    const { items } = await request.json() as { items: { id: number; quantity: number }[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    const db = getDb();

    // Verify order belongs to user and is editable
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .get(orderId, session.userId) as Order | undefined;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "shipped" || order.status === "delivered") {
      return NextResponse.json(
        { error: "Cannot edit shipped or delivered orders" },
        { status: 400 }
      );
    }

    // Update items and recalculate total in a transaction
    const updateItems = db.transaction(() => {
      const updateItem = db.prepare(
        "UPDATE order_items SET quantity = ? WHERE id = ? AND order_id = ?"
      );
      const deleteItem = db.prepare(
        "DELETE FROM order_items WHERE id = ? AND order_id = ?"
      );

      for (const item of items) {
        if (item.quantity <= 0) {
          deleteItem.run(item.id, orderId);
        } else {
          updateItem.run(item.quantity, item.id, orderId);
        }
      }

      // Recalculate total from remaining items
      const remaining = db
        .prepare("SELECT price, quantity FROM order_items WHERE order_id = ?")
        .all(orderId) as OrderItem[];

      if (remaining.length === 0) {
        // No items left — delete the order
        db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
        return { deleted: true };
      }

      const newTotal = calculateTotalPrice(remaining);

      db.prepare(
        "UPDATE orders SET total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(newTotal, orderId);

      return { deleted: false, newTotal };
    });

    const result = updateItems();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Order items PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
