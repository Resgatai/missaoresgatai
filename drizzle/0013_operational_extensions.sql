ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "member_id" uuid REFERENCES "members"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_member_id_unique" ON "users" ("member_id") WHERE "member_id" IS NOT NULL;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "mobile_phone" varchar(20);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "cpf_hash" varchar(64);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "cpf_encrypted" text;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "registration_status" varchar(20) NOT NULL DEFAULT 'approved';
UPDATE "members" SET "mobile_phone" = COALESCE(NULLIF("whatsapp", ''), NULLIF("phone", '')) WHERE "mobile_phone" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "members_cpf_hash_unique" ON "members" ("cpf_hash") WHERE "cpf_hash" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "members_registration_status_idx" ON "members" ("registration_status", "created_at");
CREATE TABLE IF NOT EXISTS "push_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "user_agent" varchar(500),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "push_devices_user_idx" ON "push_devices" ("user_id");
