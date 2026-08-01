import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

type D1Prepared = { bind: (...values: unknown[]) => D1Prepared; first: <T>() => Promise<T | null>; run: () => Promise<unknown> };
type D1Database = { prepare: (query: string) => D1Prepared; exec: (query: string) => Promise<unknown> };

function database() {
  return (env as unknown as { DB: D1Database }).DB;
}

async function ensureTable(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS tax_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    form_type TEXT NOT NULL,
    checklist_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_tax_profiles_user_entity_year ON tax_profiles(user_id, entity_type, year)").run();
}

function userId(request: NextRequest) {
  return request.headers.get("oai-authenticated-user-id") || request.headers.get("x-openai-user-id") || "local-preview";
}

function validEntity(value: unknown): value is "personal" | "business" {
  return value === "personal" || value === "business";
}

export async function GET(request: NextRequest) {
  const entity = request.nextUrl.searchParams.get("entity");
  const year = Number(request.nextUrl.searchParams.get("year") || 2026);
  if (!validEntity(entity) || !Number.isInteger(year)) return NextResponse.json({ error: "Invalid entity or year" }, { status: 400 });
  const db = database();
  await ensureTable(db);
  const id = `${userId(request)}:${entity}:${year}`;
  const row = await db.prepare("SELECT checklist_json, form_type, updated_at FROM tax_profiles WHERE id = ?").bind(id).first<{ checklist_json: string; form_type: string; updated_at: string }>();
  if (!row) return NextResponse.json({ checklist: null });
  try {
    const stored = JSON.parse(row.checklist_json) as { version?: number; checks?: Record<string, boolean>; amounts?: Record<string, number>; manualAmountKeys?: string[] } | Record<string, boolean>;
    if ("version" in stored && stored.version === 2) {
      return NextResponse.json({ checklist: stored.checks || {}, amounts: stored.amounts || {}, manualAmountKeys: stored.manualAmountKeys || [], formType: row.form_type, updatedAt: row.updated_at });
    }
    return NextResponse.json({ checklist: stored, amounts: {}, manualAmountKeys: [], formType: row.form_type, updatedAt: row.updated_at });
  } catch {
    return NextResponse.json({ checklist: null });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { entity?: unknown; year?: unknown; formType?: unknown; checklist?: unknown; amounts?: unknown; manualAmountKeys?: unknown } | null;
  const year = Number(body?.year || 2026);
  if (!body || !validEntity(body.entity) || !Number.isInteger(year) || !body.checklist || typeof body.checklist !== "object" || Array.isArray(body.checklist)) {
    return NextResponse.json({ error: "Invalid checklist" }, { status: 400 });
  }
  const expectedForm = body.entity === "personal" ? "BE" : "B";
  if (body.formType !== expectedForm) return NextResponse.json({ error: "Form does not match entity" }, { status: 400 });
  const rawAmounts = body.amounts && typeof body.amounts === "object" && !Array.isArray(body.amounts) ? body.amounts as Record<string, unknown> : {};
  const amounts = Object.fromEntries(Object.entries(rawAmounts).filter(([key, value]) => key.length <= 100 && typeof value === "number" && Number.isFinite(value) && value >= 0));
  const manualAmountKeys = Array.isArray(body.manualAmountKeys) ? body.manualAmountKeys.filter((key): key is string => typeof key === "string" && key.length <= 100 && key in amounts) : [];
  const db = database();
  await ensureTable(db);
  const owner = userId(request);
  const id = `${owner}:${body.entity}:${year}`;
  const updatedAt = new Date().toISOString();
  await db.prepare(`INSERT INTO tax_profiles (id, user_id, entity_type, year, form_type, checklist_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET form_type = excluded.form_type, checklist_json = excluded.checklist_json, updated_at = excluded.updated_at`)
    .bind(id, owner, body.entity, year, expectedForm, JSON.stringify({ version: 2, checks: body.checklist, amounts, manualAmountKeys }), updatedAt).run();
  return NextResponse.json({ ok: true, updatedAt });
}
