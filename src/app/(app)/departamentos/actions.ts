"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";

import { departmentMembers, departments, members, roles, userDepartmentScopes, userRoles, users } from "@/lib/db/schema";

const departmentSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  leaderMemberId: z.string().uuid().optional(),
});

export async function createDepartment(formData: FormData) {
  const current = await requirePermission("departamentos.gerenciar");
  const parsed = departmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/departamentos/novo?erro=Confira os dados do departamento.");
  const db = getDb();
  const existing = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, parsed.data.name)).limit(1);
  if (existing[0]) redirect("/departamentos/novo?erro=J%C3%A1 existe um departamento com esse nome.");
  if (parsed.data.leaderMemberId) {
    const leader = await db.select({ id: members.id }).from(members).where(eq(members.id, parsed.data.leaderMemberId)).limit(1);
    if (!leader[0]) redirect("/departamentos/novo?erro=L%C3%ADder n%C3%A3o encontrado.");
  }
  const [department] = await db.insert(departments).values({ name: parsed.data.name, description: parsed.data.description || null, leaderMemberId: parsed.data.leaderMemberId || null }).returning({ id: departments.id });
  if (parsed.data.leaderMemberId) {
    await db.insert(departmentMembers).values({ departmentId: department.id, memberId: parsed.data.leaderMemberId, role: "líder", isLeader: true }).onConflictDoUpdate({ target: [departmentMembers.departmentId, departmentMembers.memberId], set: { role: "líder", isLeader: true } });
    const leaderAccounts = await db.select({ userId: users.id, role: roles.slug }).from(users).innerJoin(userRoles, eq(users.id, userRoles.userId)).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(users.memberId, parsed.data.leaderMemberId));
    for (const account of leaderAccounts.filter((account) => account.role === "lider_departamento")) await db.insert(userDepartmentScopes).values({ userId: account.userId, departmentId: department.id }).onConflictDoNothing();
  }
  await writeAuditLog({ actorId: current.userId, action: "departamento.criar", entityType: "department", entityId: department.id, metadata: { leaderMemberId: parsed.data.leaderMemberId || null } });
  revalidatePath("/departamentos");
  redirect("/departamentos?criado=1");
}
