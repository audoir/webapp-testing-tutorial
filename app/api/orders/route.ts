import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateTotalPrice } from "@/lib/price";

interface CartItem {
  product_id: number;
  quantity: number;
  name: string;
  price: number;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const orders = db
      .prepare(
        `SELECT id, total, status, shipping_address, created_at, updated_at
         FROM orders WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(session.userId);

    const ordersWithItems = orders.map((order: unknown) => {
      const o = order as { id: number; total: number; status: string; shipping_address: string; created_at: string; updated_at: string };
      const items = db
        .prepare(
          `SELECT id, product_id, product_name, price, quantity
           FROM order_items WHERE order_id = ?`
        )
        .all(o.id);
      return { ...o, items };
    });

    return NextResponse.json(ordersWithItems);
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shippingAddress } = await request.json();

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get cart items
    const cartItems = db
      .prepare(
        `SELECT ci.product_id, ci.quantity, p.name, p.price
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = ?`
      )
      .all(session.userId) as CartItem[];

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const total = calculateTotalPrice(cartItems);

    // Create order in a transaction
    const createOrder = db.transaction(() => {
      const orderResult = db
        .prepare(
          `INSERT INTO orders (user_id, total, status, shipping_address)
           VALUES (?, ?, 'confirmed', ?)`
        )
        .run(session.userId, total, shippingAddress);

      const orderId = orderResult.lastInsertRowid;

      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`
      );

      for (const item of cartItems) {
        insertItem.run(orderId, item.product_id, item.name, item.price, item.quantity);
      }

      // Clear cart
      db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(session.userId);

      return orderId;
    });

    const orderId = createOrder();

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Orders POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
