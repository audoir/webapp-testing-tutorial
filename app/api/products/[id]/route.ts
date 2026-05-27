import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/products";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const product = getProductById(productId);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
