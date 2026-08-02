import { NextResponse } from "next/server";
import { accessTokenCookie } from "../../../lib/supabase-server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessTokenCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
