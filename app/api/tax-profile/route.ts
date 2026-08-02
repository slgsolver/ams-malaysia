import { NextRequest, NextResponse } from "next/server";
import { accessToken, authenticatedUser, supabaseHeaders, supabaseUrl } from "../../lib/supabase-server";

type Entity = "personal" | "business";
const validEntity = (value: unknown): value is Entity => value === "personal" || value === "business";
const unauthenticated = () => NextResponse.json({ error: "Please sign in to access your tax checklist." }, { status: 401 });

export async function GET(request: NextRequest) {
  const token = await accessToken(); const user = await authenticatedUser();
  const entity = request.nextUrl.searchParams.get("entity"); const year = Number(request.nextUrl.searchParams.get("year") || 2026);
  if (!token || !user) return unauthenticated();
  if (!validEntity(entity) || !Number.isInteger(year)) return NextResponse.json({ error: "Invalid entity or year" }, { status: 400 });
  const response = await fetch(`${supabaseUrl()}/rest/v1/tax_profiles?select=checklist_json,form_type,updated_at&entity_type=eq.${entity}&year=eq.${year}&limit=1`, { headers: supabaseHeaders(token), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Unable to load checklist." }, { status: 502 });
  const [row] = await response.json() as Array<{ checklist_json: { version?: number; checks?: Record<string, boolean>; amounts?: Record<string, number>; manualAmountKeys?: string[] }; form_type: string; updated_at: string }>;
  if (!row) return NextResponse.json({ checklist: null });
  const saved = row.checklist_json;
  return NextResponse.json({ checklist: saved.checks || {}, amounts: saved.amounts || {}, manualAmountKeys: saved.manualAmountKeys || [], formType: row.form_type, updatedAt: row.updated_at });
}

export async function POST(request: NextRequest) {
  const token = await accessToken(); const user = await authenticatedUser();
  const body = await request.json().catch(() => null) as { entity?: unknown; year?: unknown; formType?: unknown; checklist?: unknown; amounts?: unknown; manualAmountKeys?: unknown } | null;
  const year = Number(body?.year || 2026);
  if (!token || !user) return unauthenticated();
  if (!body || !validEntity(body.entity) || !Number.isInteger(year) || !body.checklist || typeof body.checklist !== "object" || Array.isArray(body.checklist)) return NextResponse.json({ error: "Invalid checklist" }, { status: 400 });
  const expectedForm = body.entity === "personal" ? "BE" : "B";
  if (body.formType !== expectedForm) return NextResponse.json({ error: "Form does not match entity" }, { status: 400 });
  const rawAmounts = body.amounts && typeof body.amounts === "object" && !Array.isArray(body.amounts) ? body.amounts as Record<string, unknown> : {};
  const amounts = Object.fromEntries(Object.entries(rawAmounts).filter(([key, value]) => key.length <= 100 && typeof value === "number" && Number.isFinite(value) && value >= 0));
  const manualAmountKeys = Array.isArray(body.manualAmountKeys) ? body.manualAmountKeys.filter((key): key is string => typeof key === "string" && key.length <= 100 && key in amounts) : [];
  const row = { user_id: user.id, entity_type: body.entity, year, form_type: expectedForm, checklist_json: { version: 2, checks: body.checklist, amounts, manualAmountKeys }, updated_at: new Date().toISOString() };
  const response = await fetch(`${supabaseUrl()}/rest/v1/tax_profiles?on_conflict=user_id,entity_type,year`, { method: "POST", headers: supabaseHeaders(token, { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(row) });
  if (!response.ok) return NextResponse.json({ error: "Unable to save checklist." }, { status: 502 });
  return NextResponse.json({ ok: true, updatedAt: row.updated_at });
}
