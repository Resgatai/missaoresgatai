import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { pushDevices } from "@/lib/db/schema";

export const runtime = "nodejs";

const tokenSchema = z.object({ token: z.string().trim().min(20).max(4096) });

export async function POST(request: Request) {
  const current = await getCurrentAuthorization();
  if (!current) return Response.json({ error: "Não autorizado" }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  const parsed = tokenSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "Token inválido" }, { status: 400 });
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;
  await getDb().insert(pushDevices).values({ userId: current.userId, token: parsed.data.token, userAgent }).onConflictDoUpdate({ target: pushDevices.token, set: { userId: current.userId, userAgent, updatedAt: new Date() } });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const current = await getCurrentAuthorization();
  if (!current) return Response.json({ error: "Não autorizado" }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  const parsed = tokenSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "Token inválido" }, { status: 400 });
  await getDb().delete(pushDevices).where(eq(pushDevices.token, parsed.data.token));
  return Response.json({ ok: true });
}
