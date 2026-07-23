CREATE TABLE "service_teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL UNIQUE,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "service_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL REFERENCES "service_teams"("id") ON DELETE RESTRICT,
  "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE RESTRICT,
  "scheduled_at" timestamptz NOT NULL,
  "notes" varchar(500),
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "service_assignments_scheduled_at_idx" ON "service_assignments" ("scheduled_at");
CREATE INDEX "service_assignments_team_idx" ON "service_assignments" ("team_id");
CREATE INDEX "service_assignments_member_idx" ON "service_assignments" ("member_id");
INSERT INTO "service_teams" ("name") VALUES ('Música'), ('Recepção'), ('Mídia'), ('Intercessão') ON CONFLICT ("name") DO NOTHING;
