import { requirePermission } from "@/lib/auth/authorization";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("usuarios.gerenciar");
  return children;
}
