import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

interface User {
  id: number;
  username: string;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db
      .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
      .get(username) as User | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
