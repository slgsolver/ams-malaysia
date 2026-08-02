import { NextRequest, NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const response = await fetch(`${supabaseUrl()}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: supabaseAnonKey(), "content-type": "application/json" },
    body: JSON.stringify({ email, create_user: true, options: { emailRedirectTo: new URL("/api/auth/callback", request.url).toString() } }),
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to send the sign-in link." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
