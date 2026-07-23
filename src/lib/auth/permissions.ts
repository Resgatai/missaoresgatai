export const rolePermissions = {
  superadministrador: ["*"],
  pastor_presidente: ["painel.visualizar", "membros.visualizar", "membros.editar", "familias.gerenciar", "departamentos.visualizar", "departamentos.gerenciar", "eventos.visualizar", "eventos.gerenciar", "presenca.visualizar", "escalas.visualizar", "escalas.gerenciar", "conteudos.visualizar", "conteudos.publicar", "comunicacao.publicar", "oracao.gerenciar", "relatorios.visualizar", "configuracoes.gerenciar", "auditoria.visualizar", "usuarios.gerenciar", "financeiro.visualizar", "financeiro.criar", "financeiro.aprovar"],
  pastor: ["painel.visualizar", "membros.visualizar", "membros.criar", "membros.editar", "familias.gerenciar", "departamentos.visualizar", "departamentos.gerenciar", "eventos.visualizar", "eventos.gerenciar", "presenca.visualizar", "presenca.criar", "escalas.visualizar", "escalas.gerenciar", "conteudos.visualizar", "conteudos.publicar", "comunicacao.publicar", "oracao.gerenciar", "relatorios.visualizar", "financeiro.visualizar", "financeiro.criar", "financeiro.aprovar"],
  secretario: ["painel.visualizar", "membros.visualizar", "membros.criar", "membros.editar", "familias.gerenciar", "departamentos.visualizar", "eventos.visualizar", "eventos.gerenciar", "presenca.visualizar", "presenca.criar", "escalas.visualizar", "escalas.gerenciar", "relatorios.visualizar"],
  tesoureiro: ["painel.visualizar", "financeiro.visualizar", "financeiro.criar", "financeiro.aprovar", "relatorios.visualizar"],
  lider_departamento: ["painel.visualizar", "departamentos.visualizar", "eventos.visualizar", "escalas.visualizar", "escalas.gerenciar", "presenca.visualizar", "presenca.criar", "comunicacao.publicar"],
  auxiliar: ["painel.visualizar", "eventos.visualizar", "escalas.visualizar", "presenca.criar"],
  membro: ["painel.visualizar", "eventos.visualizar", "conteudos.visualizar", "oracao.criar"],
} as const;

export type Role = keyof typeof rolePermissions;
export const knownRoles: Record<Role, true> = { superadministrador: true, pastor_presidente: true, pastor: true, secretario: true, tesoureiro: true, lider_departamento: true, auxiliar: true, membro: true };

export function can(roles: readonly Role[], permission: string) {
  return roles.some((role) => {
    const allowed = rolePermissions[role] as readonly string[];
    return allowed.includes("*") || allowed.includes(permission);
  });
}
