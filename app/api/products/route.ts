import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, getProductsByCategory } from "@/lib/products";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const products = category
      ? getProductsByCategory(category)
      : getAllProducts();

    return NextResponse.json(products);
  } catch (error) {
    console.error("Products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
