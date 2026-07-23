"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255) });
const resetSchema = z.object({ token: z.string().length(64), password: z.string().min(8).max(128), confirmation: z.string().min(8).max(128) }).refine((value) => value.password === value.confirmation, { message: "As senhas não conferem." });
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/recuperar-senha?erro=Informe um e-mail válido.");
  const db = getDb();
  const account = (await db.select({ id: users.id, email: users.email, status: users.status }).from(users).where(eq(users.email, parsed.data.email)).limit(1))[0];
  if (account?.status === "active") {
    const token = randomBytes(32).toString("hex");
    await db.insert(passwordResetTokens).values({ userId: account.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
    const origin = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    try { await sendPasswordResetEmail({ recipient: account.email, resetUrl: `${origin}/redefinir-senha?token=${token}` }); }
    catch { await writeAuditLog({ actorId: account.id, action: "acesso.recuperacao.erro_envio", entityType: "user", entityId: account.id }); }
  }
  redirect("/recuperar-senha?enviado=1");
}

export async function resetPassword(formData: FormData) {
  const parsed = resetSchema.safeParse({ token: formData.get("token"), password: formData.get("password"), confirmation: formData.get("confirmation") });
  if (!parsed.success) redirect(`/redefinir-senha?token=${encodeURIComponent(String(formData.get("token") ?? ""))}&erro=${encodeURIComponent("Confira a senha e a confirmação.")}`);
  const db = getDb();
  const reset = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, hashToken(parsed.data.token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1))[0];
  if (!reset) redirect("/recuperar-senha?erro=Este link expirou ou já foi utilizado.");
  await db.update(users).set({ passwordHash: await bcrypt.hash(parsed.data.password, 12), sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, reset.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, reset.id));
  await writeAuditLog({ actorId: reset.userId, action: "acesso.senha.redefinida", entityType: "user", entityId: reset.userId });
  redirect("/login?senhaRedefinida=1");
}
