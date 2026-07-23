import { requirePermission } from "@/lib/auth/authorization";

export default async function NewMemberLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("membros.criar");
  return children;
}
