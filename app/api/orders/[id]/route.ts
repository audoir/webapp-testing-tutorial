import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

interface Order {
  id: number;
  user_id: number;
  total: number;
  status: string;
  shipping_address: string;
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
    const { shippingAddress, status } = await request.json();

    const db = getDb();
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .get(orderId, session.userId) as Order | undefined;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow editing pending/confirmed orders
    if (order.status === "shipped" || order.status === "delivered") {
      return NextResponse.json(
        { error: "Cannot edit shipped or delivered orders" },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (shippingAddress !== undefined) {
      updates.push("shipping_address = ?");
      values.push(shippingAddress);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(orderId, session.userId);

    db.prepare(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const db = getDb();
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .get(orderId, session.userId) as Order | undefined;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow cancelling pending/confirmed orders
    if (order.status === "shipped" || order.status === "delivered") {
      return NextResponse.json(
        { error: "Cannot cancel shipped or delivered orders" },
        { status: 400 }
      );
    }

    db.prepare("DELETE FROM orders WHERE id = ? AND user_id = ?").run(
      orderId,
      session.userId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
