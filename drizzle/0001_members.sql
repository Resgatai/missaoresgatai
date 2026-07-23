CREATE TYPE "member_status" AS ENUM ('visitor','new_convert','congregant','active','inactive','transferred','dismissed','deceased','follow_up');
CREATE TABLE "members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name" varchar(160) NOT NULL,
  "preferred_name" varchar(160),
  "email" varchar(255),
  "phone" varchar(30),
  "whatsapp" varchar(30),
  "birth_date" date,
  "marital_status" varchar(40),
  "occupation" varchar(120),
  "city" varchar(100),
  "state" varchar(2),
  "status" "member_status" NOT NULL DEFAULT 'visitor',
  "conversion_date" date,
  "baptism_date" date,
  "entry_date" date DEFAULT now(),
  "notes" text,
  "consent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "members_name_idx" ON "members" ("full_name");
CREATE INDEX "members_status_idx" ON "members" ("status");
CREATE INDEX "members_phone_idx" ON "members" ("phone");
