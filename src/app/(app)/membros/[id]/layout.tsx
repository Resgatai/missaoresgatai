import { requirePermission } from "@/lib/auth/authorization";

export default async function MemberDetailsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("membros.visualizar");
  return children;
}
