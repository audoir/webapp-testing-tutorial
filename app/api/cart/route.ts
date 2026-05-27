import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateTotalPrice } from "@/lib/price";
import { getProductById } from "@/lib/products";

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
}

function getCartItems(db: ReturnType<typeof getDb>, userId: number): { items: CartItem[]; total: number; cartCount: number } {
  const items = db
    .prepare(
      `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`
    )
    .all(userId) as CartItem[];
  const total = calculateTotalPrice(items);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, total, cartCount };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const { items, total } = getCartItems(db, session.userId!);

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error("Cart GET error:", error);
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

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check product exists
    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Upsert cart item
    db.prepare(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`
    ).run(session.userId, productId, quantity);

    return NextResponse.json({ success: true, ...getCartItems(db, session.userId!) });
  } catch (error) {
    console.error("Cart POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cartItemId } = await request.json();

    if (!cartItemId) {
      return NextResponse.json(
        { error: "Cart item ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      "DELETE FROM cart_items WHERE id = ? AND user_id = ?"
    ).run(cartItemId, session.userId);

    return NextResponse.json({ success: true, ...getCartItems(db, session.userId!) });
  } catch (error) {
    console.error("Cart DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cartItemId, quantity } = await request.json();

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json(
        { error: "Cart item ID and quantity are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    if (quantity <= 0) {
      db.prepare(
        "DELETE FROM cart_items WHERE id = ? AND user_id = ?"
      ).run(cartItemId, session.userId);
    } else {
      db.prepare(
        "UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?"
      ).run(quantity, cartItemId, session.userId);
    }

    return NextResponse.json({ success: true, ...getCartItems(db, session.userId!) });
  } catch (error) {
    console.error("Cart PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
