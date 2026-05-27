import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: number;
  username?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "complex_password_at_least_32_characters_long_for_iron_session",
  cookieName: "store_session",
  cookieOptions: {
    // Only use secure cookies in production AND when not running locally
    // This allows tests to work with the production build on localhost
    secure: process.env.NODE_ENV === "production" && 
            !process.env.CI &&
            process.env.VERCEL_ENV === "production",
    httpOnly: true,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  if (!session.isLoggedIn) {
    session.isLoggedIn = false;
  }
  return session;
}
