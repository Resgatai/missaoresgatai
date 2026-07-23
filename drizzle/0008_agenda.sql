CREATE TYPE "agenda_event_kind" AS ENUM ('service', 'event', 'meeting');
CREATE TYPE "agenda_event_visibility" AS ENUM ('public', 'internal');
CREATE TABLE "agenda_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(160) NOT NULL,
  "kind" "agenda_event_kind" NOT NULL,
  "description" text,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "location" varchar(160),
  "visibility" "agenda_event_visibility" NOT NULL DEFAULT 'public',
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at")
);
CREATE INDEX "agenda_events_starts_at_idx" ON "agenda_events" ("starts_at");
CREATE INDEX "agenda_events_visibility_idx" ON "agenda_events" ("visibility");
