import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gte, or, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { loginAttempts, users } from "@/lib/db/schema";

const credentials = z.object({ identifier: z.string().trim().min(3).max(255), password: z.string().min(8).max(128) });
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function hashIdentifier(value: string) { return createHash("sha256").update(value).digest("hex"); }
async function registerAttempt(identifierHash: string, successful: boolean) { await getDb().insert(loginAttempts).values({ identifierHash, successful }); }
async function isTemporarilyBlocked(identifierHash: string) {
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const [row] = await getDb().select({ count: sql<number>`count(*)` }).from(loginAttempts).where(and(eq(loginAttempts.identifierHash, identifierHash), eq(loginAttempts.successful, false), gte(loginAttempts.attemptedAt, since)));
  return Number(row?.count ?? 0) >= MAX_FAILED_ATTEMPTS;
}

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) (token as typeof token & { sessionVersion?: number }).sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 1;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        Object.assign(session.user, { sessionVersion: Number((token as typeof token & { sessionVersion?: number }).sessionVersion ?? 1) });
      }
      return session;
    },
  },
  providers: [Credentials({
    name: "Credenciais",
    credentials: { identifier: { label: "E-mail ou usuário" }, password: { label: "Senha", type: "password" } },
    async authorize(raw) {
      const parsed = credentials.safeParse(raw);
      if (!parsed.success) return null;
      const identifier = parsed.data.identifier.toLowerCase();
      const identifierHash = hashIdentifier(identifier);
      if (await isTemporarilyBlocked(identifierHash)) return null;
      const account = (await getDb().select().from(users).where(or(eq(users.email, identifier), eq(users.username, identifier))).limit(1))[0];
      if (!account || account.status !== "active" || !await bcrypt.compare(parsed.data.password, account.passwordHash)) { await registerAttempt(identifierHash, false); return null; }
      await registerAttempt(identifierHash, true);
      return { id: account.id, name: account.name, email: account.email, sessionVersion: account.sessionVersion };
    },
  })],
});
