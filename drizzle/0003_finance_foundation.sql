CREATE TYPE "financial_account_kind" AS ENUM ('cash','bank');
CREATE TYPE "financial_movement_type" AS ENUM ('income','expense');
CREATE TABLE "financial_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL UNIQUE,
  "kind" "financial_account_kind" NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "financial_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL,
  "type" "financial_movement_type" NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("name", "type")
);
CREATE TABLE "financial_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference" varchar(40) NOT NULL UNIQUE,
  "type" "financial_movement_type" NOT NULL,
  "amount" numeric(14,2) NOT NULL CHECK ("amount" > 0),
  "description" varchar(500) NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "financial_accounts"("id") ON DELETE RESTRICT,
  "category_id" uuid NOT NULL REFERENCES "financial_categories"("id") ON DELETE RESTRICT,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "required_approvals" integer NOT NULL DEFAULT 1 CHECK ("required_approvals" >= 1),
  "reverses_transaction_id" uuid REFERENCES "financial_transactions"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "financial_transaction_approvals" (
  "transaction_id" uuid NOT NULL REFERENCES "financial_transactions"("id") ON DELETE RESTRICT,
  "approver_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "approved_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("transaction_id", "approver_id")
);
CREATE INDEX "financial_categories_type_idx" ON "financial_categories" ("type");
CREATE INDEX "financial_transactions_occurred_at_idx" ON "financial_transactions" ("occurred_at");
CREATE INDEX "financial_transactions_account_idx" ON "financial_transactions" ("account_id");
CREATE INDEX "financial_transaction_approvals_transaction_idx" ON "financial_transaction_approvals" ("transaction_id");
CREATE RULE "financial_transactions_no_update" AS ON UPDATE TO "financial_transactions" DO INSTEAD NOTHING;
CREATE RULE "financial_transactions_no_delete" AS ON DELETE TO "financial_transactions" DO INSTEAD NOTHING;
CREATE RULE "financial_transaction_approvals_no_update" AS ON UPDATE TO "financial_transaction_approvals" DO INSTEAD NOTHING;
CREATE RULE "financial_transaction_approvals_no_delete" AS ON DELETE TO "financial_transaction_approvals" DO INSTEAD NOTHING;
INSERT INTO "financial_accounts" ("name", "kind") VALUES ('Caixa Geral', 'cash') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "financial_categories" ("name", "type") VALUES ('Dízimos', 'income'), ('Ofertas', 'income'), ('Doações', 'income'), ('Outras receitas', 'income'), ('Água', 'expense'), ('Energia', 'expense'), ('Ação social', 'expense'), ('Materiais', 'expense'), ('Outras despesas', 'expense') ON CONFLICT ("name", "type") DO NOTHING;
