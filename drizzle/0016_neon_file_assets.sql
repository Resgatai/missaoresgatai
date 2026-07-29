CREATE TABLE IF NOT EXISTS "file_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "scope" varchar(20) NOT NULL,
  "mime_type" varchar(80) NOT NULL,
  "data" text NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "file_assets_scope_idx" ON "file_assets" ("scope", "created_at");