"use server";

import bcrypt from "bcryptjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { agendaEvents, departments, financialTransactionApprovals, financialTransactions, members, roles, serviceAssignments, userDepartmentScopes, userRoles, users } from "@/lib/db/schema";

const roleSlugs = ["superadministrador", "pastor_presidente", "pastor", "secretario", "tesoureiro", "lider_departamento", "auxiliar", "membro"] as const;
const userSchema = z.object({ name: z.string().trim().min(3).max(160), username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,80}$/), email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(8).max(128), roleSlugs: z.array(z.enum(roleSlugs)).min(1) });
const passwordResetSchema = z.object({ userId: z.string().uuid(), password: z.string().min(8).max(128) });
const userEditSchema = z.object({ userId: z.string().uuid(), name: z.string().trim().min(3).max(160), username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,80}$/), email: z.string().trim().toLowerCase().email().max(255), memberId: z.string().uuid().optional().or(z.literal("")), roleSlugs: z.array(z.enum(roleSlugs)).min(1) });

export async function createUser(formData: FormData) {
  const current = await requirePermission("usuarios.gerenciar");
  const parsed = userSchema.safeParse({ name: formData.get("name"), username: formData.get("username"), email: formData.get("email"), password: formData.get("password"), roleSlugs: formData.getAll("roleSlugs") });
  if (!parsed.success) redirect("/usuarios?erro=Confira os dados e escolha ao menos um cargo.");
  const db = getDb();
  const selectedRoles = await db.select({ id: roles.id, slug: roles.slug }).from(roles).where(inArray(roles.slug, parsed.data.roleSlugs));
  if (selectedRoles.length !== parsed.data.roleSlugs.length) redirect("/usuarios?erro=Um dos cargos selecionados não está disponível.");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const [user] = await db.insert(users).values({ name: parsed.data.name, username: parsed.data.username, email: parsed.data.email, passwordHash }).returning({ id: users.id });
    await db.insert(userRoles).values(selectedRoles.map((role) => ({ userId: user.id, roleId: role.id })));
    await writeAuditLog({ actorId: current.userId, action: "usuarios.criar", entityType: "user", entityId: user.id, metadata: { roles: selectedRoles.map((role) => role.slug) } });
  } catch {
    redirect("/usuarios?erro=Não foi possível criar. Usuário ou e-mail já existe.");
  }
  revalidatePath("/usuarios");
  redirect("/usuarios?criado=1");
}

export async function resetUserPassword(formData: FormData) {
  const current = await requirePermission("usuarios.gerenciar");
  const parsed = passwordResetSchema.safeParse({ userId: formData.get("userId"), password: formData.get("password") });
  if (!parsed.success) redirect("/usuarios?erro=Informe uma nova senha com pelo menos 8 caracteres.");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const updated = await getDb().update(users).set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` }).where(inArray(users.id, [parsed.data.userId])).returning({ id: users.id });
  if (!updated[0]) redirect("/usuarios?erro=Usuário não encontrado.");
  await writeAuditLog({ actorId: current.userId, action: "usuarios.senha.redefinir", entityType: "user", entityId: updated[0].id });
  revalidatePath("/usuarios");
  redirect("/usuarios?senhaRedefinida=1");
}

export async function setUserStatus(formData: FormData) {
  const current = await requirePermission("usuarios.gerenciar"); const parsed = z.object({ userId: z.string().uuid(), status: z.enum(["active", "inactive"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/usuarios?erro=Situação de usuário inválida.");
  if (parsed.data.status === "inactive" && parsed.data.userId === current.userId) redirect("/usuarios?erro=Você não pode inativar a própria conta.");
  const db = getDb();
  if (parsed.data.status === "inactive") {
    const targetSuper = (await db.select({ id: userRoles.userId }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(userRoles.userId, parsed.data.userId), eq(roles.slug, "superadministrador"))).limit(1))[0];
    if (targetSuper) {
      const [{ total }] = await db.select({ total: sql<number>`count(distinct ${users.id})` }).from(users).innerJoin(userRoles, eq(users.id, userRoles.userId)).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(users.status, "active"), eq(roles.slug, "superadministrador")));
      if (Number(total) <= 1) redirect("/usuarios?erro=Nao e possivel inativar o ultimo superadministrador.");
    }
  }
  await db.update(users).set({ status: parsed.data.status, sessionVersion: sql`${users.sessionVersion} + 1` }).where(inArray(users.id, [parsed.data.userId]));
  await writeAuditLog({ actorId: current.userId, action: "usuarios.situacao.atualizar", entityType: "user", entityId: parsed.data.userId, metadata: { status: parsed.data.status, sessionsRevoked: true } });
  revalidatePath("/usuarios"); redirect("/usuarios?statusAtualizado=1");
}

export async function deleteUser(formData: FormData) {
  const current = await requirePermission("usuarios.gerenciar");
  const parsed = z.object({ userId: z.string().uuid(), reason: z.string().trim().min(5).max(300) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/usuarios?erro=Informe um motivo com pelo menos 5 caracteres para excluir.");
  if (parsed.data.userId === current.userId) redirect("/usuarios?erro=Voce nao pode excluir a propria conta.");
  const db = getDb();
  const target = (await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, parsed.data.userId)).limit(1))[0];
  if (!target) redirect("/usuarios?erro=Usuario nao encontrado.");
  const targetSuper = (await db.select({ id: userRoles.userId }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(userRoles.userId, target.id), eq(roles.slug, "superadministrador"))).limit(1))[0];
  if (targetSuper) {
    const [{ total }] = await db.select({ total: sql<number>`count(distinct ${users.id})` }).from(users).innerJoin(userRoles, eq(users.id, userRoles.userId)).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(users.status, "active"), eq(roles.slug, "superadministrador")));
    if (Number(total) <= 1) redirect("/usuarios?erro=Nao e possivel excluir o ultimo superadministrador.");
  }
  const [[agenda], [finance], [approvals], [assignments]] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(agendaEvents).where(eq(agendaEvents.createdBy, target.id)),
    db.select({ total: sql<number>`count(*)` }).from(financialTransactions).where(eq(financialTransactions.createdBy, target.id)),
    db.select({ total: sql<number>`count(*)` }).from(financialTransactionApprovals).where(eq(financialTransactionApprovals.approverId, target.id)),
    db.select({ total: sql<number>`count(*)` }).from(serviceAssignments).where(eq(serviceAssignments.createdBy, target.id)),
  ]);
  if ([agenda, finance, approvals, assignments].some((row) => Number(row.total) > 0)) {
    redirect(`/usuarios?erro=Nao e possivel excluir ${target.name}: a conta possui historico protegido de eventos, escalas ou financeiro.`);
  }
  await writeAuditLog({ actorId: current.userId, action: "usuarios.excluir", entityType: "user", entityId: target.id, metadata: { name: target.name, reason: parsed.data.reason } });
  try {
    await db.delete(users).where(eq(users.id, target.id));
  } catch {
    redirect("/usuarios?erro=Nao foi possivel excluir a conta. Verifique se ha registros protegidos.");
  }
  revalidatePath("/usuarios");
  revalidatePath("/usuarios/escopos");
  redirect("/usuarios?excluido=1");
}

export async function updateUser(formData: FormData) {
  const current = await requirePermission("usuarios.gerenciar"); const parsed = userEditSchema.safeParse({ userId: formData.get("userId"), name: formData.get("name"), username: formData.get("username"), email: formData.get("email"), memberId: formData.get("memberId"), roleSlugs: formData.getAll("roleSlugs") });
  if (!parsed.success) redirect("/usuarios?erro=Confira os dados e cargos do usuário."); const db = getDb(); const selectedRoles = await db.select({ id: roles.id, slug: roles.slug }).from(roles).where(inArray(roles.slug, parsed.data.roleSlugs));
  if (selectedRoles.length !== parsed.data.roleSlugs.length) redirect("/usuarios?erro=Cargo inválido."); if (parsed.data.memberId) { const member = (await db.select({ id: members.id }).from(members).where(eq(members.id, parsed.data.memberId)).limit(1))[0]; if (!member) redirect("/usuarios?erro=Membro vinculado não encontrado."); }
  try { await db.update(users).set({ name: parsed.data.name, username: parsed.data.username, email: parsed.data.email, memberId: parsed.data.memberId || null }).where(eq(users.id, parsed.data.userId)); await db.delete(userRoles).where(eq(userRoles.userId, parsed.data.userId)); await db.insert(userRoles).values(selectedRoles.map((role) => ({ userId: parsed.data.userId, roleId: role.id }))); } catch { redirect("/usuarios?erro=Usuário, e-mail ou membro já estão vinculados."); }
  await writeAuditLog({ actorId: current.userId, action: "usuarios.atualizar", entityType: "user", entityId: parsed.data.userId, metadata: { roles: parsed.data.roleSlugs, memberId: parsed.data.memberId || null } }); revalidatePath("/usuarios"); redirect("/usuarios?atualizado=1");
}

export async function assignUserDepartmentScope(formData: FormData) {
  const current = await requirePermission("usuarios.gerenciar"); const parsed = z.object({ userId: z.string().uuid(), departmentId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/usuarios?erro=Selecione usuário e departamento.");
  const exists = (await getDb().select({ id: departments.id }).from(departments).where(inArray(departments.id, [parsed.data.departmentId])).limit(1))[0];
  if (!exists) redirect("/usuarios?erro=Departamento não encontrado.");
  await getDb().insert(userDepartmentScopes).values(parsed.data).onConflictDoNothing();
  await writeAuditLog({ actorId: current.userId, action: "usuarios.escopo_departamento.adicionar", entityType: "user", entityId: parsed.data.userId, metadata: { departmentId: parsed.data.departmentId } });
  revalidatePath("/usuarios"); redirect("/usuarios?escopoAtualizado=1");
}
