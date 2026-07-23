import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { permissions, rolePermissionAssignments, roles, userDepartmentScopes, userRoles, users } from "@/lib/db/schema";
import { can, knownRoles, type Role } from "./permissions";

export type CurrentAuthorization = { userId: string; roles: Role[]; permissions: string[]; departmentIds: string[] };

export async function getCurrentAuthorization(): Promise<CurrentAuthorization | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = getDb();
  const account = (await db.select({ status: users.status, sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, session.user.id)).limit(1))[0];
  const sessionVersion = (session.user as { sessionVersion?: number }).sessionVersion;
  if (!account || account.status !== "active" || sessionVersion !== account.sessionVersion) return null;
  const roleRows = await db.select({ id: roles.id, slug: roles.slug }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, session.user.id));
  const activeRoles = roleRows.map(({ slug }) => slug).filter((slug): slug is Role => slug in knownRoles);
  const roleIds = roleRows.map((role) => role.id);
  const dynamicPermissions = roleIds.length ? await db.select({ code: permissions.code }).from(rolePermissionAssignments).innerJoin(permissions, eq(rolePermissionAssignments.permissionId, permissions.id)).where(inArray(rolePermissionAssignments.roleId, roleIds)) : [];
  const scopedDepartments = await db.select({ departmentId: userDepartmentScopes.departmentId }).from(userDepartmentScopes).where(eq(userDepartmentScopes.userId, session.user.id));
  const codes = dynamicPermissions.map((row) => row.code);
  return { userId: session.user.id, roles: activeRoles, permissions: codes, departmentIds: scopedDepartments.map((row) => row.departmentId) };
}

export async function requirePermission(permission: string) {
  const current = await getCurrentAuthorization();
  if (!current) redirect("/login");
  const allowed = current.permissions.length ? current.permissions.includes("*") || current.permissions.includes(permission) : can(current.roles, permission);
  if (!allowed) redirect("/acesso-negado");
  return current;
}

export async function requireDepartmentScope(departmentId: string, permission: string) {
  const current = await requirePermission(permission);
  if (!current.roles.includes("lider_departamento") || current.roles.some((role) => ["superadministrador", "pastor_presidente", "pastor"].includes(role))) return current;
  if (!current.departmentIds.includes(departmentId)) redirect("/acesso-negado");
  return current;
}
