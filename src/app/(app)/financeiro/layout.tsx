import { requirePermission } from "@/lib/auth/authorization";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("financeiro.visualizar");
  return children;
}
