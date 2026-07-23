"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { churchSettings } from "@/lib/db/schema";

const optional = (value: string | undefined) => value?.trim() || null;
const normalizeInstagram = (value: string | undefined) => {
  const raw = value?.trim();
  if (!raw) return null;
  const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
  return /^[a-zA-Z0-9._]{1,30}$/.test(handle) ? `@${handle}` : undefined;
};

export async function updateChurchSettings(formData: FormData) {
  const current = await requirePermission("configuracoes.gerenciar");
  const parsed = z.object({
    churchName: z.string().trim().min(3).max(160), slogan: z.string().trim().max(240).optional(), address: z.string().trim().max(300).optional(), phone: z.string().trim().max(30).optional(), email: z.string().trim().email().optional().or(z.literal("")), instagramUrl: z.string().trim().max(300).optional().or(z.literal("")), youtubeUrl: z.string().trim().url().optional().or(z.literal("")), logoUrl: z.string().trim().max(500).refine((value) => !value || value.startsWith("branding/") || value.startsWith("https://"), "Logotipo inválido.").optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/configuracoes?erro=Confira os dados informados.");
  const instagramUrl = normalizeInstagram(parsed.data.instagramUrl);
  if (parsed.data.instagramUrl && !instagramUrl) redirect("/configuracoes?erro=Informe o Instagram no formato @conta.");
  const db = getDb();
  const existing = (await db.select({ id: churchSettings.id }).from(churchSettings).limit(1))[0];
  const values = { ...parsed.data, slogan: optional(parsed.data.slogan), address: optional(parsed.data.address), phone: optional(parsed.data.phone), email: optional(parsed.data.email), instagramUrl, youtubeUrl: optional(parsed.data.youtubeUrl), logoUrl: optional(parsed.data.logoUrl), updatedBy: current.userId, updatedAt: new Date() };
  if (existing) await db.update(churchSettings).set(values).where(eq(churchSettings.id, existing.id)); else await db.insert(churchSettings).values(values);
  await writeAuditLog({ actorId: current.userId, action: "configuracoes.atualizar", entityType: "church_settings", entityId: existing?.id });
  revalidatePath("/"); revalidatePath("/configuracoes"); redirect("/configuracoes?salvo=1");
}
