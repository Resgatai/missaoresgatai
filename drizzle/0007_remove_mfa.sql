ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_recovery_codes_pending_encrypted";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_recovery_code_hashes";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_pending_secret_encrypted";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_secret_encrypted";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_enabled";
