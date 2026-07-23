ALTER TABLE "audit_logs" ADD COLUMN "entity_id" uuid;
ALTER TABLE "audit_logs" ADD COLUMN "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "members" ADD COLUMN "notes_encrypted" text;
CREATE TABLE "login_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier_hash" varchar(64) NOT NULL,
  "successful" boolean NOT NULL,
  "attempted_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "login_attempts_identifier_time_idx" ON "login_attempts" ("identifier_hash", "attempted_at");
