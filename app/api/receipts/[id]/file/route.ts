import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

type Bindings = { DB: D1Database; RECEIPTS: R2Bucket };
const bindings = env as unknown as Bindings;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const owner = request.headers.get("oai-authenticated-user-id") ?? "local-preview";
  const row = await bindings.DB.prepare("SELECT file_key AS fileKey, file_name AS fileName, mime_type AS mimeType FROM receipts WHERE id = ? AND user_id = ?")
    .bind(id, owner).first<{ fileKey: string | null; fileName: string | null; mimeType: string | null }>();
  if (!row?.fileKey) return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
  const object = await bindings.RECEIPTS.get(row.fileKey);
  if (!object) return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": row.mimeType || "application/octet-stream",
      "content-disposition": `inline; filename="${(row.fileName || "receipt").replaceAll('"', '')}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}
