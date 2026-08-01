import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

type Bindings = {
  DB: D1Database;
  RECEIPTS: R2Bucket;
};

const bindings = env as unknown as Bindings;

async function ensureSchema() {
  await bindings.DB.batch([
    bindings.DB.prepare(`CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      merchant TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      tax_use TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 0,
      file_key TEXT,
      file_name TEXT,
      mime_type TEXT,
      created_at TEXT NOT NULL
    )`),
    bindings.DB.prepare("CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON receipts(user_id, created_at DESC)"),
    bindings.DB.prepare("CREATE INDEX IF NOT EXISTS idx_receipts_user_tax_use ON receipts(user_id, tax_use)"),
  ]);
}

function userId(request: NextRequest) {
  return request.headers.get("oai-authenticated-user-id") ?? "local-preview";
}

export async function GET(request: NextRequest) {
  await ensureSchema();
  const result = await bindings.DB.prepare(
    "SELECT id, merchant, receipt_date AS date, amount, category, tax_use AS taxUse, confidence, file_name AS fileName FROM receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT 500",
  ).bind(userId(request)).all();
  return NextResponse.json({ receipts: result.results });
}

export async function POST(request: NextRequest) {
  await ensureSchema();
  const form = await request.formData();
  const id = String(form.get("id") || crypto.randomUUID());
  const file = form.get("file");
  const owner = userId(request);
  let fileKey: string | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 400 });
    fileKey = `${owner}/${id}`;
    fileName = file.name;
    mimeType = file.type;
    await bindings.RECEIPTS.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name } });
  }

  const now = new Date().toISOString();
  await bindings.DB.prepare(`INSERT INTO receipts
    (id, user_id, merchant, receipt_date, amount, category, tax_use, confidence, file_key, file_name, mime_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id,
      owner,
      String(form.get("merchant") || "Unknown merchant"),
      String(form.get("date") || now.slice(0, 10)),
      Number(form.get("amount") || 0),
      String(form.get("category") || "Others"),
      String(form.get("taxUse") || "Review"),
      Number(form.get("confidence") || 0),
      fileKey,
      fileName,
      mimeType,
      now,
    ).run();
  return NextResponse.json({ ok: true, id });
}
