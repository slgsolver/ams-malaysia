import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, supabaseHeaders, supabaseUrl, accessToken } from "../../lib/supabase-server";

type ReceiptRow = {
  id: string; entity_type: "personal" | "business"; merchant: string; receipt_date: string; amount: number;
  category: string; tax_use: "Business" | "Relief" | "Personal" | "Review"; business_use: number;
  business_purpose: string | null; myinvois_uuid: string | null; confidence: number; file_name: string | null;
};

function unauthenticated() {
  return NextResponse.json({ error: "Please sign in to access your tax records." }, { status: 401 });
}

export async function GET() {
  const token = await accessToken();
  if (!token) return unauthenticated();
  const response = await fetch(`${supabaseUrl()}/rest/v1/receipts?select=id,entity_type,merchant,receipt_date,amount,category,tax_use,business_use,business_purpose,myinvois_uuid,confidence,file_name&order=created_at.desc&limit=500`, {
    headers: supabaseHeaders(token), cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load receipts." }, { status: 502 });
  const rows = await response.json() as ReceiptRow[];
  return NextResponse.json({ receipts: rows.map((row) => ({
    id: row.id, entity: row.entity_type, merchant: row.merchant, date: row.receipt_date, amount: Number(row.amount),
    category: row.category, taxUse: row.tax_use, businessUse: row.business_use, businessPurpose: row.business_purpose ?? undefined,
    myInvoisUuid: row.myinvois_uuid ?? undefined, confidence: row.confidence, fileName: row.file_name ?? undefined,
  })) });
}

export async function POST(request: NextRequest) {
  const token = await accessToken();
  const user = await authenticatedUser();
  if (!token || !user) return unauthenticated();
  const form = await request.formData();
  const id = String(form.get("id") || crypto.randomUUID());
  const file = form.get("file");
  let filePath: string | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 400 });
    filePath = `${user.id}/${id}`;
    fileName = file.name;
    mimeType = file.type || "application/octet-stream";
    const upload = await fetch(`${supabaseUrl()}/storage/v1/object/receipts/${filePath}`, {
      method: "POST", headers: supabaseHeaders(token, { "content-type": mimeType, "x-upsert": "false" }), body: file,
    });
    if (!upload.ok) return NextResponse.json({ error: "Unable to store the receipt file." }, { status: 502 });
  }
  const row = {
    id, user_id: user.id, entity_type: String(form.get("entity") || "business"), merchant: String(form.get("merchant") || "Unknown merchant"),
    receipt_date: String(form.get("date") || new Date().toISOString().slice(0, 10)), amount: Number(form.get("amount") || 0),
    category: String(form.get("category") || "Others"), tax_use: String(form.get("taxUse") || "Review"),
    business_use: Number(form.get("businessUse") || 0), business_purpose: String(form.get("businessPurpose") || "") || null,
    myinvois_uuid: String(form.get("myInvoisUuid") || "") || null, confidence: Number(form.get("confidence") || 0),
    file_path: filePath, file_name: fileName, mime_type: mimeType,
  };
  const insert = await fetch(`${supabaseUrl()}/rest/v1/receipts`, {
    method: "POST", headers: supabaseHeaders(token, { "content-type": "application/json", prefer: "return=minimal" }), body: JSON.stringify(row),
  });
  if (!insert.ok) return NextResponse.json({ error: "Unable to save the receipt record." }, { status: 502 });
  return NextResponse.json({ ok: true, id });
}
