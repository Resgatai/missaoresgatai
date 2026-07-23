CREATE TABLE "departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL UNIQUE,
  "description" varchar(500),
  "leader_member_id" uuid REFERENCES "members"("id") ON DELETE SET NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "departments_leader_member_idx" ON "departments" ("leader_member_id");
