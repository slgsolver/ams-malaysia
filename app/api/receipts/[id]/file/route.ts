import { NextRequest, NextResponse } from "next/server";
import { accessToken, supabaseHeaders, supabaseUrl } from "../../../../lib/supabase-server";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await accessToken();
  if (!token) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await context.params;
  const record = await fetch(`${supabaseUrl()}/rest/v1/receipts?select=file_path,file_name,mime_type&id=eq.${encodeURIComponent(id)}&limit=1`, { headers: supabaseHeaders(token), cache: "no-store" });
  if (!record.ok) return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
  const [row] = await record.json() as Array<{ file_path: string | null; file_name: string | null; mime_type: string | null }>;
  if (!row?.file_path) return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
  const file = await fetch(`${supabaseUrl()}/storage/v1/object/receipts/${row.file_path}`, { headers: supabaseHeaders(token) });
  if (!file.ok || !file.body) return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
  return new Response(file.body, { headers: { "content-type": row.mime_type || "application/octet-stream", "content-disposition": `inline; filename="${(row.file_name || "receipt").replaceAll('"', "")}"`, "cache-control": "private, max-age=3600" } });
}
