import { requirePermission } from "@/lib/auth/authorization";

export default async function NewDepartmentLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("departamentos.gerenciar");
  return children;
}
