import { eq } from "drizzle-orm";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { fileAssets } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = (await getDb().select({ data: fileAssets.data, mimeType: fileAssets.mimeType, scope: fileAssets.scope }).from(fileAssets).where(eq(fileAssets.id, id)).limit(1))[0];
  if (!asset) return new Response("Imagem nao encontrada.", { status: 404 });
  if (asset.scope !== "event" && !(await getCurrentAuthorization())) return new Response("Nao autorizado.", { status: 401 });
  return new Response(Buffer.from(asset.data, "base64"), { headers: { "content-type": asset.mimeType, "cache-control": asset.scope === "event" ? "public, max-age=3600" : "private, no-store", "x-content-type-options": "nosniff" } });
}