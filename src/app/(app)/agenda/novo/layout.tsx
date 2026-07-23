import { requirePermission } from "@/lib/auth/authorization";

export default async function NewAgendaEventLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("eventos.gerenciar");
  return children;
}
