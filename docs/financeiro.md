# Fundação financeira

O módulo financeiro mantém lançamentos imutáveis: o banco bloqueia atualização e exclusão de movimentações e aprovações. Uma correção deve criar um lançamento de estorno, preservando a trilha original.

## Fluxo de aprovação

1. Tesoureiro, pastor, pastor-presidente ou superadministrador registra uma entrada ou saída.
2. Uma aprovação registrada por qualquer um desses perfis autoriza o lançamento; o próprio criador também pode aprová-lo.
3. Cada criação e aprovação é registrada na auditoria.

## Permissões

- `financeiro.visualizar`: consulta lançamentos e relatórios futuros.
- `financeiro.criar`: registra lançamentos.
- `financeiro.aprovar`: registra uma aprovação.

Para atualizar um banco existente para a aprovação única, execute `npm run db:migrate:finance:single-approval`.
