-- Base complementar do MVP do PRD. Todas as mudanças são aditivas.
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "previous_data" jsonb;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "new_data" jsonb;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" varchar(64);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" varchar(500);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "address" varchar(300);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "neighborhood" varchar(120);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "zip_code" varchar(12);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "document_number" varchar(30);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "photo_url" text;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "guardian_name" varchar(160);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "is_minor" boolean NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "family_id" uuid;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "agenda_events" ADD COLUMN IF NOT EXISTS "capacity" integer;
ALTER TABLE "agenda_events" ADD COLUMN IF NOT EXISTS "registration_required" boolean NOT NULL DEFAULT false;
ALTER TABLE "agenda_events" ADD COLUMN IF NOT EXISTS "recurrence_rule" varchar(160);
ALTER TABLE "agenda_events" ADD COLUMN IF NOT EXISTS "canceled_at" timestamptz;
ALTER TABLE "service_teams" ADD COLUMN IF NOT EXISTS "department_id" uuid;
ALTER TABLE "service_assignments" ADD COLUMN IF NOT EXISTS "event_id" uuid;
ALTER TABLE "service_assignments" ADD COLUMN IF NOT EXISTS "function_name" varchar(120);
ALTER TABLE "service_assignments" ADD COLUMN IF NOT EXISTS "status" varchar(30) NOT NULL DEFAULT 'pending';
ALTER TABLE "service_assignments" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamptz;
ALTER TABLE "service_assignments" ADD COLUMN IF NOT EXISTS "replacement_member_id" uuid;

CREATE TABLE IF NOT EXISTS "families" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(160) NOT NULL, "phone" varchar(30), "email" varchar(255), "address" varchar(300), "notes_encrypted" text, "active" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "families_name_idx" ON "families" ("name");
CREATE TABLE IF NOT EXISTS "family_members" (
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE, "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE, "relationship" varchar(80), "is_primary_contact" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("family_id", "member_id")
);
CREATE INDEX IF NOT EXISTS "members_family_idx" ON "members" ("family_id");
CREATE TABLE IF NOT EXISTS "member_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE, "action" varchar(120) NOT NULL, "details" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "member_history_member_idx" ON "member_history" ("member_id", "created_at");
CREATE TABLE IF NOT EXISTS "member_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE, "name" varchar(160) NOT NULL, "url" text NOT NULL, "mime_type" varchar(120), "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "member_documents_member_idx" ON "member_documents" ("member_id");

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE, "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE, PRIMARY KEY ("role_id", "permission_id")
);
CREATE TABLE IF NOT EXISTS "user_department_scopes" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE, "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("user_id", "department_id")
);
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "token_hash" varchar(64) NOT NULL UNIQUE, "expires_at" timestamptz NOT NULL, "used_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_idx" ON "password_reset_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expiry_idx" ON "password_reset_tokens" ("expires_at");

CREATE TABLE IF NOT EXISTS "department_members" (
  "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE, "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE, "role" varchar(100) NOT NULL DEFAULT 'integrante', "is_leader" boolean NOT NULL DEFAULT false, "joined_at" date DEFAULT now(), "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("department_id", "member_id")
);
CREATE INDEX IF NOT EXISTS "department_members_member_idx" ON "department_members" ("member_id");
CREATE TABLE IF NOT EXISTS "department_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE, "title" varchar(180) NOT NULL, "description" text, "due_at" timestamptz, "assigned_member_id" uuid REFERENCES "members"("id") ON DELETE SET NULL, "status" varchar(30) NOT NULL DEFAULT 'open', "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "department_tasks_department_idx" ON "department_tasks" ("department_id", "status");

CREATE TABLE IF NOT EXISTS "event_registrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "event_id" uuid NOT NULL REFERENCES "agenda_events"("id") ON DELETE CASCADE, "member_id" uuid REFERENCES "members"("id") ON DELETE SET NULL, "visitor_name" varchar(160), "visitor_email" varchar(255), "status" varchar(30) NOT NULL DEFAULT 'registered', "checked_in_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "event_registrations_event_idx" ON "event_registrations" ("event_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "event_registrations_event_member_idx" ON "event_registrations" ("event_id", "member_id");
CREATE TABLE IF NOT EXISTS "attendance_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "event_id" uuid NOT NULL REFERENCES "agenda_events"("id") ON DELETE CASCADE, "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE, "present" boolean NOT NULL DEFAULT true, "recorded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "recorded_at" timestamptz NOT NULL DEFAULT now(), UNIQUE ("event_id", "member_id")
);
CREATE INDEX IF NOT EXISTS "attendance_event_idx" ON "attendance_records" ("event_id");

CREATE TABLE IF NOT EXISTS "wall_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(180) NOT NULL, "body" text NOT NULL, "audience" varchar(30) NOT NULL DEFAULT 'all', "department_id" uuid REFERENCES "departments"("id") ON DELETE SET NULL, "published_at" timestamptz NOT NULL DEFAULT now(), "expires_at" timestamptz, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "wall_posts_published_idx" ON "wall_posts" ("published_at");
CREATE TABLE IF NOT EXISTS "content_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "type" varchar(30) NOT NULL, "title" varchar(180) NOT NULL, "description" text, "url" text NOT NULL, "speaker" varchar(160), "published_at" timestamptz NOT NULL DEFAULT now(), "visible" boolean NOT NULL DEFAULT true, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "content_items_type_published_idx" ON "content_items" ("type", "published_at");
CREATE TABLE IF NOT EXISTS "radio_stations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(120) NOT NULL, "stream_url" text NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prayer_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "requester_name" varchar(160), "requester_email" varchar(255), "body_encrypted" text NOT NULL, "confidential" boolean NOT NULL DEFAULT false, "status" varchar(30) NOT NULL DEFAULT 'open', "assigned_to" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "answered_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "prayer_requests_status_idx" ON "prayer_requests" ("status", "created_at");
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "title" varchar(160) NOT NULL, "body" text, "href" varchar(500), "read_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read_at", "created_at");
CREATE TABLE IF NOT EXISTS "church_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "church_name" varchar(160) NOT NULL DEFAULT 'Missão Resgatai', "slogan" varchar(240), "address" varchar(300), "phone" varchar(30), "email" varchar(255), "instagram_url" text, "youtube_url" text, "logo_url" text, "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "updated_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "permissions" ("code", "description") VALUES
  ('*', 'Acesso completo'), ('membros.criar', 'Criar membros'), ('membros.editar', 'Editar membros'), ('membros.visualizar', 'Consultar membros'), ('familias.gerenciar', 'Gerenciar famílias'), ('departamentos.gerenciar', 'Gerenciar departamentos'), ('departamentos.visualizar', 'Consultar departamentos'), ('eventos.gerenciar', 'Gerenciar eventos'), ('eventos.visualizar', 'Consultar eventos'), ('presenca.criar', 'Registrar presença'), ('presenca.visualizar', 'Consultar presença'), ('escalas.gerenciar', 'Gerenciar escalas'), ('escalas.visualizar', 'Consultar escalas'), ('conteudos.publicar', 'Publicar conteúdos'), ('conteudos.visualizar', 'Consultar conteúdos'), ('comunicacao.publicar', 'Publicar avisos'), ('oracao.gerenciar', 'Gerenciar pedidos de oração'), ('oracao.criar', 'Criar pedidos de oração'), ('relatorios.visualizar', 'Consultar relatórios'), ('configuracoes.gerenciar', 'Gerenciar configurações'), ('auditoria.visualizar', 'Consultar auditoria'), ('usuarios.gerenciar', 'Gerenciar usuários'), ('financeiro.visualizar', 'Consultar financeiro'), ('financeiro.criar', 'Criar lançamentos'), ('financeiro.aprovar', 'Aprovar lançamentos')
ON CONFLICT ("code") DO NOTHING;
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p
WHERE (r.slug = 'superadministrador') OR
      (r.slug = 'pastor_presidente' AND p.code IN ('painel.visualizar','membros.visualizar','membros.editar','familias.gerenciar','departamentos.visualizar','departamentos.gerenciar','eventos.visualizar','eventos.gerenciar','presenca.visualizar','escalas.visualizar','escalas.gerenciar','conteudos.visualizar','conteudos.publicar','comunicacao.publicar','oracao.gerenciar','relatorios.visualizar','configuracoes.gerenciar','auditoria.visualizar','usuarios.gerenciar','financeiro.visualizar','financeiro.criar','financeiro.aprovar')) OR
      (r.slug = 'pastor' AND p.code IN ('painel.visualizar','membros.visualizar','membros.criar','membros.editar','familias.gerenciar','departamentos.visualizar','departamentos.gerenciar','eventos.visualizar','eventos.gerenciar','presenca.visualizar','presenca.criar','escalas.visualizar','escalas.gerenciar','conteudos.visualizar','conteudos.publicar','comunicacao.publicar','oracao.gerenciar','relatorios.visualizar','financeiro.visualizar','financeiro.criar','financeiro.aprovar')) OR
      (r.slug = 'secretario' AND p.code IN ('painel.visualizar','membros.visualizar','membros.criar','membros.editar','familias.gerenciar','departamentos.visualizar','eventos.visualizar','eventos.gerenciar','presenca.visualizar','presenca.criar','escalas.visualizar','escalas.gerenciar','relatorios.visualizar')) OR
      (r.slug = 'tesoureiro' AND p.code IN ('painel.visualizar','financeiro.visualizar','financeiro.criar','financeiro.aprovar','relatorios.visualizar')) OR
      (r.slug = 'lider_departamento' AND p.code IN ('painel.visualizar','departamentos.visualizar','eventos.visualizar','escalas.visualizar','escalas.gerenciar','presenca.visualizar','presenca.criar','comunicacao.publicar')) OR
      (r.slug = 'auxiliar' AND p.code IN ('painel.visualizar','eventos.visualizar','escalas.visualizar','presenca.criar')) OR
      (r.slug = 'membro' AND p.code IN ('painel.visualizar','eventos.visualizar','conteudos.visualizar','oracao.criar'))
ON CONFLICT DO NOTHING;
CREATE RULE "audit_logs_no_update" AS ON UPDATE TO "audit_logs" DO INSTEAD NOTHING;
CREATE RULE "audit_logs_no_delete" AS ON DELETE TO "audit_logs" DO INSTEAD NOTHING;
