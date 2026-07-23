import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { eq } from "drizzle-orm";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";

const labels: Record<string, string> = { superadministrador: "Superadministrador(a)", pastor_presidente: "Pastor(a) presidente", pastor: "Pastor(a)", secretario: "Secretário(a)", tesoureiro: "Tesoureiro(a)", lider_departamento: "Líder de departamento", auxiliar: "Auxiliar", membro: "Membro" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const current = await getCurrentAuthorization();
  if (!session?.user?.id || !current) {
    const requestHeaders = await headers(); const requestPath = requestHeaders.get("x-request-path"); const callbackUrl = requestPath?.startsWith("/") && !requestPath.startsWith("//") ? requestPath : "/painel";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const db = getDb();
  const account = (await db.select({ name: users.name, status: users.status }).from(users).where(eq(users.id, current.userId)).limit(1))[0];
  if (!account || account.status !== "active") redirect("/login");
  const roleRows = await db.select({ slug: roles.slug }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, current.userId));
  return <AppShell userName={account.name} roleName={labels[roleRows[0]?.slug] || "Usuário"} permissions={current.permissions}>{children}</AppShell>;
}
