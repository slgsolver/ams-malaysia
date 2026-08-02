import { NextResponse } from "next/server";
import { authenticatedUser } from "../../../lib/supabase-server";

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { email: user.email ?? "" } });
}
