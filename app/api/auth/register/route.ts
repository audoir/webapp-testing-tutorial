import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
      .get(username, email);

    if (existingUser) {
      return NextResponse.json(
        { error: "Username or email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db
      .prepare(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
      )
      .run(username, email, passwordHash);

    const session = await getSession();
    session.userId = result.lastInsertRowid as number;
    session.username = username;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true, username });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
