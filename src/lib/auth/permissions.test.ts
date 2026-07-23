import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("matriz de permissões", () => {
  it("mantém o financeiro restrito aos perfis autorizados", () => {
    expect(can(["tesoureiro"], "financeiro.aprovar")).toBe(true);
    expect(can(["pastor"], "financeiro.aprovar")).toBe(true);
    expect(can(["membro"], "financeiro.aprovar")).toBe(false);
  });

  it("não concede gestão geral ao líder de departamento", () => {
    expect(can(["lider_departamento"], "usuarios.gerenciar")).toBe(false);
    expect(can(["lider_departamento"], "escalas.gerenciar")).toBe(true);
  });
});
