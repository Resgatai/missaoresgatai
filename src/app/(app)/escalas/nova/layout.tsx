import { requirePermission } from "@/lib/auth/authorization";

export default async function NewServiceAssignmentLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("escalas.gerenciar");
  return children;
}
