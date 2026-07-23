import { randomUUID } from "node:crypto";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { can } from "@/lib/auth/permissions";
import { firebaseStorage } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const maxBytes = 5 * 1024 * 1024;
type Authorization = NonNullable<Awaited<ReturnType<typeof getCurrentAuthorization>>>;
type UploadScope = "logo" | "member" | "event";

function hasPermission(current: Authorization, permission: string) {
  return current.permissions.includes("*") || current.permissions.includes(permission) || can(current.roles, permission);
}

function validImage(bytes: Uint8Array, mime: string) {
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return (mime === "image/png" && png) || (mime === "image/jpeg" && jpeg);
}

function allowedScope(scope: FormDataEntryValue | null): scope is UploadScope {
  return scope === "logo" || scope === "member" || scope === "event";
}

function canUpload(current: Authorization, scope: UploadScope) {
  if (scope === "logo") return hasPermission(current, "configuracoes.gerenciar");
  if (scope === "event") return hasPermission(current, "eventos.gerenciar");
  return hasPermission(current, "membros.editar") || hasPermission(current, "membros.criar");
}

function folderFor(scope: UploadScope) {
  if (scope === "logo") return "branding";
  if (scope === "event") return "events";
  return "members";
}

export async function POST(request: Request) {
  const current = await getCurrentAuthorization();
  if (!current) return Response.json({ error: "Nao autorizado." }, { status: 401 });

  const form = await request.formData();
  const scope = form.get("scope");
  const file = form.get("file");

  if (!allowedScope(scope)) return Response.json({ error: "Escopo de imagem invalido." }, { status: 400 });
  if (!canUpload(current, scope)) return Response.json({ error: "Nao autorizado." }, { status: 403 });
  if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) return Response.json({ error: "Envie uma imagem PNG ou JPEG de ate 5 MB." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validImage(bytes, file.type)) return Response.json({ error: "O arquivo precisa ser um PNG ou JPEG valido." }, { status: 400 });

  try {
    const extension = file.type === "image/png" ? "png" : "jpg";
    const path = `${folderFor(scope)}/${randomUUID()}.${extension}`;
    const stored = firebaseStorage().file(path);
    await stored.save(Buffer.from(bytes), { contentType: file.type, metadata: { cacheControl: "private,max-age=3600" } });
    const [url] = await stored.getSignedUrl({ action: "read", expires: Date.now() + 60 * 60 * 1000 });
    return Response.json({ path, url });
  } catch {
    return Response.json({ error: "Firebase ainda nao foi configurado no ambiente." }, { status: 503 });
  }
}
