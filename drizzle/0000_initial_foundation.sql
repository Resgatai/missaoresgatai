CREATE TYPE "user_status" AS ENUM ('active','inactive','invited');
CREATE TABLE "users" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"name" varchar(160) NOT NULL,"username" varchar(80) NOT NULL UNIQUE,"email" varchar(255) NOT NULL UNIQUE,"password_hash" text NOT NULL,"status" "user_status" NOT NULL DEFAULT 'active',"created_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "roles" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"name" varchar(100) NOT NULL UNIQUE,"slug" varchar(100) NOT NULL UNIQUE,"description" text,"is_system" boolean NOT NULL DEFAULT true);
CREATE TABLE "permissions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"code" varchar(120) NOT NULL UNIQUE,"description" text);
CREATE TABLE "user_roles" ("user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,PRIMARY KEY("user_id","role_id"));
CREATE TABLE "audit_logs" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,"action" varchar(120) NOT NULL,"entity_type" varchar(80) NOT NULL,"created_at" timestamptz NOT NULL DEFAULT now());
