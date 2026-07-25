"use server";

import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { memberHistory, members, roles, userRoles, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit";
import { encryptSensitiveText } from "@/lib/security/encryption";

const memberSchema = z.object({
  fullName: z.string().trim().min(3).max(160), preferredName: z.string().trim().max(160).optional(), email: z.string().trim().email().optional().or(z.literal("")), mobilePhone: z.string().trim().max(20).optional(), instagram: z.string().trim().max(300).optional().or(z.literal("")), cpf: z.string().trim().max(20).optional(), birthDate: z.string().optional(), maritalStatus: z.string().trim().max(40).optional(), occupation: z.string().trim().max(120).optional(), address: z.string().trim().max(300).optional(), neighborhood: z.string().trim().max(120).optional(), city: z.string().trim().max(100).optional(), state: z.string().trim().length(2).optional().or(z.literal("")), zipCode: z.string().trim().max(12).optional(), guardianName: z.string().trim().max(160).optional(), status: z.enum(["visitor", "new_convert", "congregant", "active", "inactive", "transferred", "dismissed", "deceased", "follow_up"]), notes: z.string().trim().max(3000).optional(), createAccount: z.enum(["on"]).optional(), username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/).optional().or(z.literal("")), password: z.string().min(8).max(128).optional().or(z.literal("")), passwordConfirmation: z.string().min(8).max(128).optional().or(z.literal("")),
});

const emptyToUndefined = (value: string | undefined) => value?.trim() || undefined;
const digits = (value: string | undefined) => value?.replace(/\D/g, "") || undefined;
const normalizeInstagram = (value: string | undefined) => { const raw = value?.trim(); if (!raw) return undefined; const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, ""); return /^[a-zA-Z0-9._]{1,30}$/.test(handle) ? `@${handle}` : undefined; };
const validCpf = (cpf: string) => { if (!/^\d{11}$/.test(cpf) || /^([0-9])\1+$/.test(cpf)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i); let check = (sum * 10) % 11; if (check === 10) check = 0; if (check !== Number(cpf[9])) return false; sum = 0; for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i); check = (sum * 10) % 11; return (check === 10 ? 0 : check) === Number(cpf[10]); };

async function createLinkedAccount(data: z.infer<typeof memberSchema>, memberId: string) {
  if (data.createAccount !== "on") return;
  if (!emptyToUndefined(data.email) || !emptyToUndefined(data.username)) throw new Error("Informe e-mail e usuario para criar a conta.");
  if (!data.password || data.password !== data.passwordConfirmation) throw new Error("Confira a senha e a confirmacao.");
  const db = getDb();
  const email = data.email!.trim().toLowerCase();
  const username = data.username!.trim().toLowerCase();
  const conflict = await db.select({ id: users.id }).from(users).where(or(eq(users.email, email), eq(users.username, username))).limit(1);
  if (conflict[0]) throw new Error("Ja existe uma conta com este e-mail ou usuario.");
  const [account] = await db.insert(users).values({ name: data.fullName, username, email, passwordHash: await bcrypt.hash(data.password, 12), status: "active", memberId }).returning({ id: users.id });
  const memberRole = (await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, "membro")).limit(1))[0];
  if (memberRole) await db.insert(userRoles).values({ userId: account.id, roleId: memberRole.id }).onConflictDoNothing();
}

export async function createMember(formData: FormData) {
  const currentUser = await requirePermission("membros.criar");
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/membros/novo?erro=Confira os campos obrigatorios.");
  const data = parsed.data;
  const instagram = normalizeInstagram(data.instagram); if (data.instagram && !instagram) redirect("/membros/novo?erro=Informe o Instagram no formato @conta.");
  const cpf = digits(data.cpf); if (cpf && !validCpf(cpf)) redirect("/membros/novo?erro=CPF invalido.");
  const db = getDb(); const notes = emptyToUndefined(data.notes); if (data.createAccount === "on") { if (!emptyToUndefined(data.email) || !emptyToUndefined(data.username)) redirect("/membros/novo?erro=Informe e-mail e usuario para criar a conta."); if (!data.password || data.password !== data.passwordConfirmation) redirect("/membros/novo?erro=Confira a senha e a confirmacao."); const conflict = await db.select({ id: users.id }).from(users).where(or(eq(users.email, data.email!.trim().toLowerCase()), eq(users.username, data.username!.trim().toLowerCase()))).limit(1); if (conflict[0]) redirect("/membros/novo?erro=Ja existe uma conta com este e-mail ou usuario."); }
  const [member] = await db.insert(members).values({ fullName: data.fullName, preferredName: emptyToUndefined(data.preferredName), email: emptyToUndefined(data.email)?.toLowerCase(), mobilePhone: digits(data.mobilePhone), instagram, cpfHash: cpf ? createHash("sha256").update(cpf).digest("hex") : undefined, cpfEncrypted: cpf ? encryptSensitiveText(cpf) : undefined, birthDate: emptyToUndefined(data.birthDate), maritalStatus: emptyToUndefined(data.maritalStatus), occupation: emptyToUndefined(data.occupation), address: emptyToUndefined(data.address), neighborhood: emptyToUndefined(data.neighborhood), city: emptyToUndefined(data.city), state: emptyToUndefined(data.state)?.toUpperCase(), zipCode: emptyToUndefined(data.zipCode), guardianName: emptyToUndefined(data.guardianName), status: data.status, registrationStatus: "approved", notesEncrypted: notes ? encryptSensitiveText(notes) : undefined, consentAt: new Date() }).returning({ id: members.id });
  try { await createLinkedAccount(data, member.id); } catch (error) { redirect(`/membros/novo?erro=${encodeURIComponent(error instanceof Error ? error.message : "Nao foi possivel criar a conta.")}`); }
  await writeAuditLog({ actorId: currentUser.userId, action: "membros.criar", entityType: "member", entityId: member.id, metadata: { sensitiveFieldsProtected: Boolean(notes || cpf), requestedUserAccount: data.createAccount === "on" } });
  revalidatePath("/membros"); redirect("/membros?criado=1");
}

export async function updateMember(formData: FormData) {
  const currentUser = await requirePermission("membros.editar"); const id = z.string().uuid().safeParse(formData.get("id")); const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !parsed.success) redirect(`/membros/${String(formData.get("id") ?? "")}?erro=Confira os campos obrigatorios.`);
  const data = parsed.data; const db = getDb(); const notes = emptyToUndefined(data.notes); if (data.createAccount === "on") { if (!emptyToUndefined(data.email) || !emptyToUndefined(data.username)) redirect("/membros/novo?erro=Informe e-mail e usuario para criar a conta."); if (!data.password || data.password !== data.passwordConfirmation) redirect("/membros/novo?erro=Confira a senha e a confirmacao."); const conflict = await db.select({ id: users.id }).from(users).where(or(eq(users.email, data.email!.trim().toLowerCase()), eq(users.username, data.username!.trim().toLowerCase()))).limit(1); if (conflict[0]) redirect("/membros/novo?erro=Ja existe uma conta com este e-mail ou usuario."); } const instagram = normalizeInstagram(data.instagram);
  if (data.instagram && !instagram) redirect(`/membros/${id.data}/editar?erro=Informe o Instagram no formato @conta.`);
  const existing = (await db.select({ id: members.id, status: members.status }).from(members).where(eq(members.id, id.data)).limit(1))[0]; if (!existing) redirect("/membros?erro=Membro nao encontrado.");
  const cpf = digits(data.cpf); if (cpf && !validCpf(cpf)) redirect(`/membros/${id.data}/editar?erro=CPF invalido.`);
  await db.update(members).set({ fullName: data.fullName, preferredName: emptyToUndefined(data.preferredName), email: emptyToUndefined(data.email)?.toLowerCase(), mobilePhone: digits(data.mobilePhone), instagram, cpfHash: cpf ? createHash("sha256").update(cpf).digest("hex") : null, cpfEncrypted: cpf ? encryptSensitiveText(cpf) : null, birthDate: emptyToUndefined(data.birthDate), maritalStatus: emptyToUndefined(data.maritalStatus), occupation: emptyToUndefined(data.occupation), address: emptyToUndefined(data.address), neighborhood: emptyToUndefined(data.neighborhood), city: emptyToUndefined(data.city), state: emptyToUndefined(data.state)?.toUpperCase(), zipCode: emptyToUndefined(data.zipCode), guardianName: emptyToUndefined(data.guardianName), status: data.status, notesEncrypted: notes ? encryptSensitiveText(notes) : null, updatedAt: new Date() }).where(eq(members.id, id.data));
  await db.insert(memberHistory).values({ memberId: id.data, action: "cadastro.atualizado", createdBy: currentUser.userId, details: { previousStatus: existing.status, status: data.status } });
  await writeAuditLog({ actorId: currentUser.userId, action: "membros.atualizar", entityType: "member", entityId: id.data, previousData: { status: existing.status }, newData: { status: data.status } });
  revalidatePath("/membros"); revalidatePath(`/membros/${id.data}`); redirect(`/membros/${id.data}?atualizado=1`);
}

export async function archiveMember(formData: FormData) {
  const currentUser = await requirePermission("membros.editar"); const id = z.string().uuid().safeParse(formData.get("id")); if (!id.success) redirect("/membros");
  await getDb().update(members).set({ archivedAt: new Date(), status: "inactive", updatedAt: new Date() }).where(eq(members.id, id.data));
  await getDb().insert(memberHistory).values({ memberId: id.data, action: "cadastro.arquivado", createdBy: currentUser.userId });
  await writeAuditLog({ actorId: currentUser.userId, action: "membros.arquivar", entityType: "member", entityId: id.data });
  revalidatePath("/membros"); redirect("/membros?arquivado=1");
}