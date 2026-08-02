import { NextRequest, NextResponse } from "next/server";
import { accessTokenCookie, supabaseAnonKey, supabaseUrl } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") ?? "email";
  if (!tokenHash) return NextResponse.redirect(new URL("/?signin=failed", request.url));
  const response = await fetch(`${supabaseUrl()}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: supabaseAnonKey(), "content-type": "application/json" },
    body: JSON.stringify({ token_hash: tokenHash, type }),
  });
  if (!response.ok) return NextResponse.redirect(new URL("/?signin=failed", request.url));
  const session = await response.json() as { access_token?: string; expires_in?: number };
  if (!session.access_token) return NextResponse.redirect(new URL("/?signin=failed", request.url));
  const next = NextResponse.redirect(new URL("/", request.url));
  next.cookies.set(accessTokenCookie, session.access_token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: session.expires_in ?? 3600 });
  return next;
}
