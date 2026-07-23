"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { memberHistory, members } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit";
import { encryptSensitiveText } from "@/lib/security/encryption";

const memberSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  mobilePhone: z.string().trim().max(20).optional(),
  instagram: z.string().trim().max(300).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional(),
  birthDate: z.string().optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().length(2).optional().or(z.literal("")),
  status: z.enum(["visitor", "new_convert", "congregant", "active", "inactive", "transferred", "dismissed", "deceased", "follow_up"]),
  notes: z.string().trim().max(3000).optional(),
});

const emptyToUndefined = (value: string | undefined) => value?.trim() || undefined;
const digits = (value: string | undefined) => value?.replace(/\D/g, "") || undefined;
const normalizeInstagram = (value: string | undefined) => {
  const raw = value?.trim();
  if (!raw) return undefined;
  const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
  return /^[a-zA-Z0-9._]{1,30}$/.test(handle) ? `@${handle}` : undefined;
};
const validCpf = (cpf: string) => { if (!/^\d{11}$/.test(cpf) || /^([0-9])\1+$/.test(cpf)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i); let check = (sum * 10) % 11; if (check === 10) check = 0; if (check !== Number(cpf[9])) return false; sum = 0; for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i); check = (sum * 10) % 11; return (check === 10 ? 0 : check) === Number(cpf[10]); };

export async function createMember(formData: FormData) {
  const currentUser = await requirePermission("membros.criar");
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/membros/novo?erro=Confira os campos obrigatórios.");
  const data = parsed.data;
  const instagram = normalizeInstagram(data.instagram); if (data.instagram && !instagram) redirect("/membros/novo?erro=Informe o Instagram no formato @conta.");
  const db = getDb();
  const notes = emptyToUndefined(data.notes);
  const cpf = digits(data.cpf); if (cpf && !validCpf(cpf)) redirect("/membros/novo?erro=CPF inválido."); const cpfHash = cpf ? createHash("sha256").update(cpf).digest("hex") : undefined;
  const [member] = await db.insert(members).values({ fullName: data.fullName, email: emptyToUndefined(data.email), mobilePhone: digits(data.mobilePhone), instagram, cpfHash, cpfEncrypted: cpf ? encryptSensitiveText(cpf) : undefined, birthDate: emptyToUndefined(data.birthDate), city: emptyToUndefined(data.city), state: emptyToUndefined(data.state)?.toUpperCase(), status: data.status, notesEncrypted: notes ? encryptSensitiveText(notes) : undefined, consentAt: new Date() }).returning({ id: members.id });
  await writeAuditLog({ actorId: currentUser.userId, action: "membros.criar", entityType: "member", entityId: member.id, metadata: { sensitiveFieldsProtected: Boolean(notes) } });
  revalidatePath("/membros");
  redirect("/membros?criado=1");
}

export async function updateMember(formData: FormData) {
  const currentUser = await requirePermission("membros.editar");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !parsed.success) redirect(`/membros/${String(formData.get("id") ?? "")}?erro=Confira os campos obrigatórios.`);
  const data = parsed.data; const db = getDb(); const notes = emptyToUndefined(data.notes);
  const instagram = normalizeInstagram(data.instagram); if (data.instagram && !instagram) redirect(`/membros/${id.data}/editar?erro=Informe o Instagram no formato @conta.`);
  const existing = (await db.select({ id: members.id, status: members.status }).from(members).where(eq(members.id, id.data)).limit(1))[0];
  if (!existing) redirect("/membros?erro=Membro não encontrado.");
  const cpf = digits(data.cpf); if (cpf && !validCpf(cpf)) redirect(`/membros/${id.data}/editar?erro=CPF inválido.`); const cpfHash = cpf ? createHash("sha256").update(cpf).digest("hex") : undefined;
  await db.update(members).set({ fullName: data.fullName, email: emptyToUndefined(data.email), mobilePhone: digits(data.mobilePhone), instagram, cpfHash, cpfEncrypted: cpf ? encryptSensitiveText(cpf) : null, birthDate: emptyToUndefined(data.birthDate), city: emptyToUndefined(data.city), state: emptyToUndefined(data.state)?.toUpperCase(), status: data.status, notesEncrypted: notes ? encryptSensitiveText(notes) : null, updatedAt: new Date() }).where(eq(members.id, id.data));
  await db.insert(memberHistory).values({ memberId: id.data, action: "cadastro.atualizado", createdBy: currentUser.userId, details: { previousStatus: existing.status, status: data.status } });
  await writeAuditLog({ actorId: currentUser.userId, action: "membros.atualizar", entityType: "member", entityId: id.data, previousData: { status: existing.status }, newData: { status: data.status } });
  revalidatePath("/membros"); revalidatePath(`/membros/${id.data}`); redirect(`/membros/${id.data}?atualizado=1`);
}

export async function archiveMember(formData: FormData) {
  const currentUser = await requirePermission("membros.editar"); const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/membros");
  await getDb().update(members).set({ archivedAt: new Date(), status: "inactive", updatedAt: new Date() }).where(eq(members.id, id.data));
  await getDb().insert(memberHistory).values({ memberId: id.data, action: "cadastro.arquivado", createdBy: currentUser.userId });
  await writeAuditLog({ actorId: currentUser.userId, action: "membros.arquivar", entityType: "member", entityId: id.data });
  revalidatePath("/membros"); redirect("/membros?arquivado=1");
}
