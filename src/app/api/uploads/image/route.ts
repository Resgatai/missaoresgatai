import { randomUUID } from "node:crypto";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { fileAssets } from "@/lib/db/schema";

export const runtime = "nodejs";
const maxBytes = 5 * 1024 * 1024;
type UploadScope = "logo" | "member" | "event";
function hasPermission(current: NonNullable<Awaited<ReturnType<typeof getCurrentAuthorization>>>, permission: string) { return current.permissions.includes("*") || current.permissions.includes(permission) || can(current.roles, permission); }
function validImage(bytes: Uint8Array, mime: string) { const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a; const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; return (mime === "image/png" && png) || (mime === "image/jpeg" && jpeg); }
function allowedScope(value: FormDataEntryValue | null): value is UploadScope { return value === "logo" || value === "member" || value === "event"; }
function canUpload(current: NonNullable<Awaited<ReturnType<typeof getCurrentAuthorization>>>, scope: UploadScope) { if (scope === "logo") return hasPermission(current, "configuracoes.gerenciar"); if (scope === "event") return hasPermission(current, "eventos.gerenciar"); return hasPermission(current, "membros.editar") || hasPermission(current, "membros.criar"); }

export async function POST(request: Request) {
  const current = await getCurrentAuthorization();
  if (!current) return Response.json({ error: "Nao autorizado." }, { status: 401 });
  const form = await request.formData(); const scope = form.get("scope"); const file = form.get("file");
  if (!allowedScope(scope)) return Response.json({ error: "Escopo de imagem invalido." }, { status: 400 });
  if (!canUpload(current, scope)) return Response.json({ error: "Nao autorizado." }, { status: 403 });
  if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) return Response.json({ error: "Envie uma imagem PNG ou JPEG de ate 5 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validImage(bytes, file.type)) return Response.json({ error: "O arquivo precisa ser um PNG ou JPEG valido." }, { status: 400 });
  const id = randomUUID();
  const path = `/api/uploads/image/${id}`;
  await getDb().insert(fileAssets).values({ id, scope, mimeType: file.type, data: Buffer.from(bytes).toString("base64"), createdBy: current.userId });
  return Response.json({ path, url: path });
}