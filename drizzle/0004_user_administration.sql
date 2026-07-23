INSERT INTO "roles" ("name", "slug", "description", "is_system") VALUES
  ('Superadministrador', 'superadministrador', 'Acesso completo ao sistema', true),
  ('Pastor presidente', 'pastor_presidente', 'Aprovação e relatórios gerais', true),
  ('Pastor', 'pastor', 'Gestão pastoral autorizada', true),
  ('Secretário', 'secretario', 'Secretaria e cadastro de membros', true),
  ('Tesoureiro', 'tesoureiro', 'Lançamentos financeiros sem aprovação própria', true),
  ('Líder de departamento', 'lider_departamento', 'Acesso restrito ao departamento', true),
  ('Auxiliar', 'auxiliar', 'Apoio operacional restrito', true),
  ('Membro', 'membro', 'Área individual do membro', true)
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
