import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
const sql = neon(process.env.DATABASE_URL);
const content = (await readFile(new URL("../drizzle/0012_mvp_complete.sql", import.meta.url), "utf8")).replace(/^--.*$/gm, "");
for (const statement of content.split(";").map((value) => value.trim()).filter(Boolean)) {
  try { await sql.query(statement); }
  catch (error) {
    if (statement.startsWith("CREATE RULE") && error instanceof Error && error.message.includes("already exists")) continue;
    throw error;
  }
}
console.log("Migração complementar do MVP aplicada.");
