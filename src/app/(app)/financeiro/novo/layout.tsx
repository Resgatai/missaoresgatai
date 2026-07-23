import { requirePermission } from "@/lib/auth/authorization";

export default async function NewFinanceTransactionLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("financeiro.criar");
  return children;
}
