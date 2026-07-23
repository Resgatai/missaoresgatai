DROP RULE "financial_transactions_no_update" ON "financial_transactions";
ALTER TABLE "financial_transactions" ALTER COLUMN "required_approvals" SET DEFAULT 1;
UPDATE "financial_transactions" SET "required_approvals" = 1 WHERE "required_approvals" <> 1;
CREATE RULE "financial_transactions_no_update" AS ON UPDATE TO "financial_transactions" DO INSTEAD NOTHING;
